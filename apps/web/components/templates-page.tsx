"use client";

import {
  AlertDialog,
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Dialog,
  DropdownMenu,
  Flex,
  Grid,
  Heading,
  IconButton,
  ScrollArea,
  Select,
  Separator,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import type {
  CloneTaskSkillInput,
  PreviewTaskSkillApplyInput,
  ProjectSummary,
  TaskSkillApplyPreview,
  TaskSkillDetail,
  TaskSkillSubtaskDefinition,
  UpdateTaskSkillMetadataInput,
  WorkspaceMember,
} from "@task/api-client";
import {
  CheckCircle2,
  Copy,
  ListChecks,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { localizeWorkspaceError } from "../lib/i18n/errors";
import { useI18n } from "../lib/i18n/i18n";
import {
  buildCreateTaskSkillInput,
  buildTaskSkillApplyInput,
  extractTaskSkillSubtasks,
  getLatestTaskSkillVersion,
  isAppliedTaskSkillSummary,
  isTaskSkillApplyPreview,
  isTaskSkillDetail,
  normalizeTaskSkillSubtasks,
  readApiError,
  splitTaskSkillList,
} from "../lib/task-skill-input";
import { useWorkspaceData } from "../lib/use-workspace-data";
import { useWorkspaceStore } from "../lib/workspace-store";
import { resolveWorkspaceRouteProject } from "../lib/workspace-url";

type Feedback = { color: "green" | "red"; message: string } | null;

export function TemplatesPage(): ReactNode {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedSkillId = searchParams.get("skill");
  const { data, error, loading, refresh } = useWorkspaceData();
  const storedProjectId = useWorkspaceStore((state) => state.selectedProjectId);
  const selectedProjectId =
    data === null
      ? storedProjectId
      : (resolveWorkspaceRouteProject(
          pathname,
          searchParams.get("project"),
          storedProjectId,
          data.projects,
          data.views,
        )?.id ?? null);
  const [query, setQuery] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TaskSkillDetail | null>(null);
  const [preview, setPreview] = useState<TaskSkillApplyPreview | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const filteredSkills = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ru");
    if (needle.length === 0) return data?.taskSkills ?? [];
    return (data?.taskSkills ?? []).filter((skill) =>
      [skill.name, skill.description ?? "", ...skill.aliases]
        .join(" ")
        .toLocaleLowerCase("ru")
        .includes(needle),
    );
  }, [data?.taskSkills, query]);

  useEffect(() => {
    const skills = data?.taskSkills ?? [];
    if (
      selectedSkillId === null &&
      requestedSkillId !== null &&
      skills.some((skill) => skill.id === requestedSkillId)
    ) {
      setSelectedSkillId(requestedSkillId);
      return;
    }
    if (selectedSkillId !== null && skills.some((skill) => skill.id === selectedSkillId)) return;
    setSelectedSkillId(skills.at(0)?.id ?? null);
  }, [data?.taskSkills, requestedSkillId, selectedSkillId]);

  useEffect(() => {
    if (data === null || selectedSkillId === null) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    setDetail(null);
    setPreview(null);
    void requestJson(
      `/api/task-skills/${selectedSkillId}?workspaceId=${encodeURIComponent(data.workspace.id)}`,
      { signal: controller.signal },
      isTaskSkillDetail,
      t("templates.loadOneError"),
    )
      .then((result) => setDetail(result))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setFeedback({
          color: "red",
          message: toErrorMessage(requestError, t("templates.actionError")),
        });
      });
    return () => controller.abort();
  }, [data, selectedSkillId, t]);

  if (loading && data === null)
    return (
      <Card>
        <Text color="gray">{t("templates.loading")}</Text>
      </Card>
    );
  if (error !== null || data === null)
    return (
      <Card>
        <Flex direction="column" gap="3" align="start">
          <Heading size="4">{t("templates.loadError")}</Heading>
          <Text color="gray">{localizeWorkspaceError(error, t, "templates.backendError")}</Text>
          <Button onClick={() => void refresh()}>{t("common.retry")}</Button>
        </Flex>
      </Card>
    );

  const workspaceId = data.workspace.id;
  const runDetailMutation = async (
    method: "PATCH" | "POST",
    body: unknown,
    successMessage: string,
  ): Promise<TaskSkillDetail | null> => {
    if (selectedSkillId === null) return null;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await requestJson(
        `/api/task-skills/${selectedSkillId}`,
        {
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
          method,
        },
        isTaskSkillDetail,
        t("templates.invalidUpdate"),
      );
      setDetail(result);
      await refresh();
      setFeedback({ color: "green", message: successMessage });
      return result;
    } catch (mutationError: unknown) {
      setFeedback({
        color: "red",
        message: toErrorMessage(mutationError, t("templates.actionError")),
      });
      return null;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center" gap="3" wrap="wrap">
        <Box>
          <Heading size="6">{t("templates.title")}</Heading>
          <Text color="gray" size="2">
            {t("templates.subtitle")}
          </Text>
        </Box>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> {t("templates.new")}
        </Button>
      </Flex>

      {feedback !== null && (
        <Callout.Root color={feedback.color}>
          <Callout.Icon>
            <CheckCircle2 size={16} />
          </Callout.Icon>
          <Callout.Text>{feedback.message}</Callout.Text>
        </Callout.Root>
      )}

      <Grid columns={{ initial: "1", md: "320px minmax(0, 1fr)" }} gap="4" align="start">
        <Card>
          <Flex direction="column" gap="3">
            <TextField.Root
              aria-label={t("templates.search")}
              placeholder={t("templates.searchPlaceholder")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            >
              <TextField.Slot>
                <Search size={15} />
              </TextField.Slot>
            </TextField.Root>
            <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 560 }}>
              <Flex direction="column" gap="1" pr="2">
                {filteredSkills.map((skill) => (
                  <Button
                    key={skill.id}
                    variant={skill.id === selectedSkillId ? "soft" : "ghost"}
                    color={skill.id === selectedSkillId ? "indigo" : "gray"}
                    onClick={() => {
                      setFeedback(null);
                      setSelectedSkillId(skill.id);
                    }}
                    style={{
                      height: "auto",
                      justifyContent: "flex-start",
                      paddingBlock: 10,
                    }}
                  >
                    <Flex gap="3" align="start">
                      <Workflow size={17} />
                      <Flex direction="column" align="start" gap="1">
                        <Text weight="medium">{skill.name}</Text>
                        <Text size="1" color="gray">
                          {skill.description ?? t("common.noDescription")}
                        </Text>
                      </Flex>
                    </Flex>
                  </Button>
                ))}
                {filteredSkills.length === 0 && (
                  <Flex direction="column" align="center" gap="2" py="6">
                    <Workflow size={24} />
                    <Text color="gray" align="center" size="2">
                      {data.taskSkills.length === 0
                        ? t("templates.empty")
                        : t("templates.noResults")}
                    </Text>
                    {data.taskSkills.length === 0 && (
                      <Button size="1" variant="soft" onClick={() => setCreateOpen(true)}>
                        {t("templates.createFirst")}
                      </Button>
                    )}
                  </Flex>
                )}
              </Flex>
            </ScrollArea>
          </Flex>
        </Card>

        {selectedSkillId === null ? (
          <EmptyDetail onCreate={() => setCreateOpen(true)} />
        ) : detail === null ? (
          <Card>
            <Text color="gray">{t("templates.loadingOne")}</Text>
          </Card>
        ) : (
          <Card>
            <Flex direction="column" gap="5">
              <Flex justify="between" align="start" gap="3">
                <Flex gap="3" align="start">
                  <Box>
                    <Workflow size={22} />
                  </Box>
                  <Box>
                    <Flex align="center" gap="2" wrap="wrap">
                      <Heading size="5">{detail.name}</Heading>
                      <Badge color="gray">v{getLatestTaskSkillVersion(detail)?.version ?? 1}</Badge>
                    </Flex>
                    <Text color="gray" size="2">
                      {t("templates.subtaskCount", {
                        count: extractTaskSkillSubtasks(detail).length,
                      })}
                    </Text>
                  </Box>
                </Flex>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <IconButton variant="ghost" color="gray" aria-label={t("templates.actions")}>
                      <MoreHorizontal size={17} />
                    </IconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item onSelect={() => setCloneOpen(true)}>
                      <Copy size={14} /> {t("templates.clone")}
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item color="red" onSelect={() => setArchiveOpen(true)}>
                      <Trash2 size={14} /> {t("common.archive")}
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </Flex>

              <MetadataForm
                key={`metadata-${detail.id}-${detail.updatedAt}`}
                busy={busy}
                detail={detail}
                onSave={(input) =>
                  runDetailMutation(
                    "PATCH",
                    { action: "metadata", input, workspaceId },
                    t("templates.metadataSaved"),
                  ).then(() => undefined)
                }
              />
              <Separator size="4" />
              <DefinitionForm
                key={`definition-${detail.id}-${detail.versions.length}`}
                busy={busy}
                detail={detail}
                members={data.workspace.members}
                onSave={(subtasks) =>
                  runDetailMutation(
                    "PATCH",
                    {
                      action: "definition",
                      input: {
                        definition: {
                          subtasks,
                        },
                      },
                      workspaceId,
                    },
                    t("templates.versionSaved"),
                  ).then(() => undefined)
                }
              />
              <Separator size="4" />
              <ApplyForm
                busy={busy}
                detail={detail}
                initialProjectId={selectedProjectId}
                members={data.workspace.members}
                preview={preview}
                projects={data.projects}
                onPreview={async (input) => {
                  setBusy(true);
                  setFeedback(null);
                  try {
                    const result = await requestJson(
                      `/api/task-skills/${detail.id}`,
                      {
                        body: JSON.stringify({
                          action: "preview",
                          input,
                          workspaceId,
                        }),
                        headers: { "content-type": "application/json" },
                        method: "POST",
                      },
                      isTaskSkillApplyPreview,
                      t("templates.invalidPreview"),
                    );
                    setPreview(result);
                  } catch (previewError: unknown) {
                    setFeedback({
                      color: "red",
                      message: toErrorMessage(previewError, t("templates.actionError")),
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
                onApply={async (input) => {
                  setBusy(true);
                  setFeedback(null);
                  try {
                    const result = await requestJson(
                      `/api/task-skills/${detail.id}`,
                      {
                        body: JSON.stringify({
                          action: "apply",
                          input,
                          workspaceId,
                        }),
                        headers: { "content-type": "application/json" },
                        method: "POST",
                      },
                      isAppliedTaskSkillSummary,
                      t("templates.invalidApply"),
                    );
                    setPreview(null);
                    await refresh();
                    setFeedback({
                      color: "green",
                      message: t("templates.createdFeedback", { count: result.createdCount }),
                    });
                  } catch (applyError: unknown) {
                    setFeedback({
                      color: "red",
                      message: toErrorMessage(applyError, t("templates.actionError")),
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </Flex>
          </Card>
        )}
      </Grid>

      <CreateTemplateDialog
        busy={busy}
        members={data.workspace.members}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (input) => {
          setBusy(true);
          setFeedback(null);
          try {
            const created = await requestJson(
              "/api/task-skills",
              {
                body: JSON.stringify({ input, workspaceId }),
                headers: { "content-type": "application/json" },
                method: "POST",
              },
              isTaskSkillDetail,
              t("templates.invalidCreate"),
            );
            setCreateOpen(false);
            setSelectedSkillId(created.id);
            setDetail(created);
            await refresh();
            setFeedback({ color: "green", message: t("templates.created") });
          } catch (createError: unknown) {
            setFeedback({
              color: "red",
              message: toErrorMessage(createError, t("templates.actionError")),
            });
          } finally {
            setBusy(false);
          }
        }}
      />
      {detail !== null && (
        <>
          <CloneTemplateDialog
            busy={busy}
            detail={detail}
            open={cloneOpen}
            onOpenChange={setCloneOpen}
            onClone={async (input) => {
              const cloned = await runDetailMutation(
                "POST",
                { action: "clone", input, workspaceId },
                t("templates.cloned"),
              );
              if (cloned !== null) {
                setCloneOpen(false);
                setSelectedSkillId(cloned.id);
              }
            }}
          />
          <ArchiveTemplateDialog
            busy={busy}
            name={detail.name}
            open={archiveOpen}
            onOpenChange={setArchiveOpen}
            onArchive={async () => {
              setBusy(true);
              setFeedback(null);
              try {
                const response = await fetch(
                  `/api/task-skills/${detail.id}?workspaceId=${encodeURIComponent(workspaceId)}`,
                  { method: "DELETE" },
                );
                const body: unknown = await response.json();
                if (!response.ok) throw new Error(readApiError(body, t("templates.archiveError")));
                setArchiveOpen(false);
                setSelectedSkillId(null);
                setDetail(null);
                await refresh();
                setFeedback({ color: "green", message: t("templates.archived") });
              } catch (archiveError: unknown) {
                setFeedback({
                  color: "red",
                  message: toErrorMessage(archiveError, t("templates.actionError")),
                });
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
    </Flex>
  );
}

function EmptyDetail({ onCreate }: Readonly<{ onCreate: () => void }>): ReactNode {
  const { t } = useI18n();
  return (
    <Card>
      <Flex direction="column" align="center" gap="3" py="8">
        <Workflow size={32} />
        <Heading size="4">{t("templates.emptyTitle")}</Heading>
        <Text color="gray" align="center" size="2">
          {t("templates.emptyText")}
        </Text>
        <Button onClick={onCreate}>{t("templates.new")}</Button>
      </Flex>
    </Card>
  );
}

function MetadataForm({
  busy,
  detail,
  onSave,
}: Readonly<{
  busy: boolean;
  detail: TaskSkillDetail;
  onSave: (input: UpdateTaskSkillMetadataInput) => Promise<void>;
}>): ReactNode {
  const { t } = useI18n();
  const [name, setName] = useState(detail.name);
  const [description, setDescription] = useState(detail.description ?? "");
  const [aliases, setAliases] = useState(detail.aliases.join(", "));
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({
          aliases: splitTaskSkillList(aliases),
          description: description.trim().length === 0 ? null : description.trim(),
          name: name.trim(),
        });
      }}
    >
      <Flex direction="column" gap="3">
        <Heading size="3">{t("templates.basics")}</Heading>
        <Field label={t("common.name")}>
          <TextField.Root value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label={t("common.description")}>
          <TextArea value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <Field label={t("templates.aliases")}>
          <TextField.Root
            value={aliases}
            onChange={(event) => setAliases(event.target.value)}
            placeholder={t("templates.aliasPlaceholder")}
          />
        </Field>
        <Flex justify="end">
          <Button type="submit" variant="soft" disabled={busy || name.trim().length === 0}>
            {t("common.save")}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}

function DefinitionForm({
  busy,
  detail,
  members,
  onSave,
}: Readonly<{
  busy: boolean;
  detail: TaskSkillDetail;
  members: WorkspaceMember[];
  onSave: (subtasks: TaskSkillSubtaskDefinition[]) => Promise<void>;
}>): ReactNode {
  const { t } = useI18n();
  const [subtasks, setSubtasks] = useState<TaskSkillSubtaskDefinition[]>(
    extractTaskSkillSubtasks(detail),
  );
  const parsed = normalizeTaskSkillSubtasks(subtasks);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(parsed);
      }}
    >
      <Flex direction="column" gap="3">
        <Box>
          <Heading size="3">{t("templates.structure")}</Heading>
          <Text size="2" color="gray">
            {t("templates.structureHint")}
          </Text>
        </Box>
        <SubtaskDefinitionEditor members={members} subtasks={subtasks} onChange={setSubtasks} />
        <Flex justify="between" align="center">
          <Text size="1" color="gray">
            {t("templates.subtaskCount", { count: parsed.length })}
          </Text>
          <Button type="submit" variant="soft" disabled={busy || parsed.length === 0}>
            {t("templates.saveVersion")}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}

const unassignedValue = "unassigned";

function SubtaskDefinitionEditor({
  members,
  onChange,
  subtasks,
}: Readonly<{
  members: WorkspaceMember[];
  onChange: (subtasks: TaskSkillSubtaskDefinition[]) => void;
  subtasks: TaskSkillSubtaskDefinition[];
}>): ReactNode {
  const { t } = useI18n();
  const updateSubtask = (index: number, changes: Partial<TaskSkillSubtaskDefinition>): void => {
    onChange(
      subtasks.map((subtask, subtaskIndex) =>
        subtaskIndex === index ? { ...subtask, ...changes } : subtask,
      ),
    );
  };

  return (
    <Flex direction="column" gap="3">
      {subtasks.map((subtask, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: unsaved template rows have no durable identifier yet.
        <Flex key={`subtask-${index}`} direction="column" gap="2">
          {index > 0 && <Separator size="4" />}
          <Flex align="center" justify="between" gap="2">
            <Text size="2" weight="medium">
              {t("templates.subtaskNumber", { count: index + 1 })}
            </Text>
            <IconButton
              type="button"
              aria-label={t("templates.removeSubtask", { count: index + 1 })}
              color="gray"
              variant="ghost"
              disabled={subtasks.length === 1}
              onClick={() => onChange(subtasks.filter((_, subtaskIndex) => subtaskIndex !== index))}
            >
              <X size={15} />
            </IconButton>
          </Flex>
          <Grid columns={{ initial: "1", sm: "1fr 1fr" }} gap="2">
            <Field label={t("common.name")}>
              <TextField.Root
                value={subtask.title}
                placeholder={t("templates.subtaskTitlePlaceholder")}
                onChange={(event) => updateSubtask(index, { title: event.target.value })}
              />
            </Field>
            <Field label={t("task.assignee")}>
              <Select.Root
                value={subtask.assigneeUserId ?? unassignedValue}
                onValueChange={(value) =>
                  updateSubtask(index, {
                    assigneeUserId: value === unassignedValue ? null : value,
                  })
                }
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value={unassignedValue}>{t("common.notAssigned")}</Select.Item>
                  {members.map((member) => (
                    <Select.Item key={member.userId} value={member.userId}>
                      {member.displayName}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Field>
            <Field label={t("common.description")}>
              <TextField.Root
                value={subtask.description ?? ""}
                placeholder={t("templates.optional")}
                onChange={(event) => updateSubtask(index, { description: event.target.value })}
              />
            </Field>
            <Field label={t("task.labels")}>
              <TextField.Root
                value={(subtask.labels ?? []).join(", ")}
                placeholder={t("templates.labelsPlaceholder")}
                onChange={(event) =>
                  updateSubtask(index, {
                    labels: splitTaskSkillList(event.target.value),
                  })
                }
              />
            </Field>
          </Grid>
        </Flex>
      ))}
      <Flex justify="start">
        <Button
          type="button"
          color="gray"
          variant="soft"
          onClick={() => onChange([...subtasks, { title: "" }])}
        >
          <Plus size={15} /> {t("templates.addSubtask")}
        </Button>
      </Flex>
    </Flex>
  );
}

function ApplyForm({
  busy,
  detail,
  initialProjectId,
  members,
  onApply,
  onPreview,
  preview,
  projects,
}: Readonly<{
  busy: boolean;
  detail: TaskSkillDetail;
  initialProjectId: string | null;
  members: WorkspaceMember[];
  onApply: (input: PreviewTaskSkillApplyInput) => Promise<void>;
  onPreview: (input: PreviewTaskSkillApplyInput) => Promise<void>;
  preview: TaskSkillApplyPreview | null;
  projects: ProjectSummary[];
}>): ReactNode {
  const { t } = useI18n();
  const defaultProjectId =
    projects.some((project) => project.id === initialProjectId) && initialProjectId !== null
      ? initialProjectId
      : (projects.at(0)?.id ?? "");
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [rootTaskTitle, setRootTaskTitle] = useState("");
  const [addedSubtasks, setAddedSubtasks] = useState("");
  const [removedSubtasks, setRemovedSubtasks] = useState("");
  const memberNames = new Map(members.map((member) => [member.userId, member.displayName]));
  const input = buildTaskSkillApplyInput({
    addedSubtasks,
    projectId,
    removedSubtasks,
    rootTaskTitle,
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onPreview(input);
      }}
    >
      <Flex direction="column" gap="3">
        <Box>
          <Heading size="3">{t("templates.apply")}</Heading>
          <Text color="gray" size="2">
            {t("templates.applyHint")}
          </Text>
        </Box>
        {projects.length === 0 ? (
          <Callout.Root color="amber">
            <Callout.Text>{t("templates.createProjectFirst")}</Callout.Text>
          </Callout.Root>
        ) : (
          <>
            <Field label={t("common.project")}>
              <Select.Root value={projectId} onValueChange={setProjectId}>
                <Select.Trigger />
                <Select.Content>
                  {projects.map((project) => (
                    <Select.Item key={project.id} value={project.id}>
                      {project.title}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Field>
            <Field label={t("templates.rootTaskTitle")}>
              <TextField.Root
                value={rootTaskTitle}
                onChange={(event) => setRootTaskTitle(event.target.value)}
                placeholder={detail.name}
              />
            </Field>
            <Grid columns={{ initial: "1", sm: "1fr 1fr" }} gap="3">
              <Field label={t("templates.includeSubtasks")}>
                <TextField.Root
                  value={addedSubtasks}
                  onChange={(event) => setAddedSubtasks(event.target.value)}
                  placeholder={t("templates.commaSeparated")}
                />
              </Field>
              <Field label={t("templates.excludeSubtasks")}>
                <TextField.Root
                  value={removedSubtasks}
                  onChange={(event) => setRemovedSubtasks(event.target.value)}
                  placeholder={t("templates.commaSeparated")}
                />
              </Field>
            </Grid>
            <Flex justify="end">
              <Button
                type="submit"
                variant="soft"
                disabled={busy || projectId.length === 0 || rootTaskTitle.trim().length === 0}
              >
                {t("templates.preview")}
              </Button>
            </Flex>
          </>
        )}
        {preview !== null && preview.taskSkillId === detail.id && (
          <Card variant="surface">
            <Flex direction="column" gap="3">
              <Flex align="center" gap="2">
                <ListChecks size={17} />
                <Text weight="bold">{preview.rootTaskTitle}</Text>
                <Badge color="gray">v{preview.taskSkillVersion}</Badge>
              </Flex>
              <Flex direction="column" gap="2" pl="4">
                {preview.subtasks.map((subtask) => (
                  <Flex key={`${subtask.source}-${subtask.title}`} align="center" gap="2">
                    <Text color="gray">↳</Text>
                    <Text size="2">{subtask.title}</Text>
                    {subtask.source === "added" && (
                      <Badge color="green">{t("templates.added")}</Badge>
                    )}
                    {typeof subtask.assigneeUserId === "string" && (
                      <Badge color="blue">
                        {memberNames.get(subtask.assigneeUserId) ?? t("task.assignee")}
                      </Badge>
                    )}
                    {subtask.labels.map((label) => (
                      <Badge key={label} color="gray">
                        {label}
                      </Badge>
                    ))}
                  </Flex>
                ))}
              </Flex>
              <Flex justify="end">
                <Button type="button" disabled={busy} onClick={() => void onApply(input)}>
                  {t("templates.createdCount", { count: preview.subtasks.length + 1 })}
                </Button>
              </Flex>
            </Flex>
          </Card>
        )}
      </Flex>
    </form>
  );
}

function CreateTemplateDialog({
  busy,
  members,
  onCreate,
  onOpenChange,
  open,
}: Readonly<{
  busy: boolean;
  members: WorkspaceMember[];
  onCreate: (input: ReturnType<typeof buildCreateTaskSkillInput>) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}>): ReactNode {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [aliases, setAliases] = useState("");
  const [subtasks, setSubtasks] = useState<TaskSkillSubtaskDefinition[]>([{ title: "" }]);
  const parsedSubtasks = normalizeTaskSkillSubtasks(subtasks);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="560px">
        <Dialog.Title>{t("templates.new")}</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          {t("templates.newHint")}
        </Dialog.Description>
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void onCreate(
              buildCreateTaskSkillInput({
                aliases,
                description,
                name,
                subtasks,
              }),
            );
          }}
        >
          <Flex direction="column" gap="3" mt="4">
            <Field label={t("common.name")}>
              <TextField.Root
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("templates.namePlaceholder")}
              />
            </Field>
            <Field label={t("common.description")}>
              <TextArea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <Field label={t("templates.aliases")}>
              <TextField.Root
                value={aliases}
                onChange={(event) => setAliases(event.target.value)}
                placeholder={t("templates.aliasPlaceholder")}
              />
            </Field>
            <SubtaskDefinitionEditor members={members} subtasks={subtasks} onChange={setSubtasks} />
            <Flex justify="between" align="center">
              <Text color="gray" size="1">
                {t("templates.subtaskCount", { count: parsedSubtasks.length })}
              </Text>
              <Flex gap="2">
                <Dialog.Close>
                  <Button type="button" variant="soft" color="gray">
                    {t("common.cancel")}
                  </Button>
                </Dialog.Close>
                <Button
                  type="submit"
                  disabled={busy || name.trim().length === 0 || parsedSubtasks.length === 0}
                >
                  {busy ? t("workspace.creating") : t("common.create")}
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function CloneTemplateDialog({
  busy,
  detail,
  onClone,
  onOpenChange,
  open,
}: Readonly<{
  busy: boolean;
  detail: TaskSkillDetail;
  onClone: (input: CloneTaskSkillInput) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}>): ReactNode {
  const { t } = useI18n();
  const [name, setName] = useState(() => t("templates.copyDefault", { name: detail.name }));
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>{t("templates.cloneTitle")}</Dialog.Title>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onClone({
              aliases: detail.aliases,
              description: detail.description ?? null,
              name: name.trim(),
            });
          }}
        >
          <Flex direction="column" gap="4" mt="4">
            <Field label={t("templates.copyName")}>
              <TextField.Root value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Flex justify="end" gap="2">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  {t("common.cancel")}
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={busy || name.trim().length === 0}>
                {t("templates.clone")}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function ArchiveTemplateDialog({
  busy,
  name,
  onArchive,
  onOpenChange,
  open,
}: Readonly<{
  busy: boolean;
  name: string;
  onArchive: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}>): ReactNode {
  const { t } = useI18n();
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content maxWidth="440px">
        <AlertDialog.Title>{t("templates.archiveConfirm", { name })}</AlertDialog.Title>
        <AlertDialog.Description size="2">{t("templates.archiveHint")}</AlertDialog.Description>
        <Flex justify="end" gap="2" mt="4">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              {t("common.cancel")}
            </Button>
          </AlertDialog.Cancel>
          <Button color="red" disabled={busy} onClick={() => void onArchive()}>
            {t("common.archive")}
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

function Field({ children, label }: Readonly<{ children: ReactNode; label: string }>): ReactNode {
  return (
    <Flex direction="column" gap="1">
      <Text as="label" size="2" weight="medium">
        {label}
      </Text>
      {children}
    </Flex>
  );
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  guard: (value: unknown) => value is T,
  fallback: string,
): Promise<T> {
  const response = await fetch(url, init);
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(readApiError(body, fallback));
  if (!guard(body)) throw new Error(fallback);
  return body;
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
