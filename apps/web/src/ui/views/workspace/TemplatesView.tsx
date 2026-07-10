import type {
  PreviewTaskSkillApplyInput,
  TaskApiClient,
  TaskSkillApplyPreview,
  TaskSkillDetail,
} from "@task/api-client";
import {
  Alert,
  Box,
  Button,
  ContentGrid,
  Flex,
  Heading,
  Input,
  type RadixSelectOption,
  Select,
  Text,
} from "@task/ui/app";
import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildTemplateSkillSummary, filterTemplateSkillRows } from "../workspaceViewModels.js";
import {
  buildCreateTaskSkillInput,
  buildTaskSkillApplyInput,
  shouldAcceptTaskSkillSettlement,
  splitTaskSkillList,
} from "./templatesViewModels.js";
import type {
  ProjectSummary,
  TaskSkillDetail as TaskSkillDetailDto,
  TaskSkillSummary,
} from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

type ActionFeedback = { message: string; mode: "error" | "info" } | null;

export type TemplatesViewProps = {
  client: TaskApiClient | null;
  projects: ProjectSummary[];
  skills: TaskSkillSummary[];
  workspaceId: string | null;
};

export function TemplatesView({
  client,
  projects,
  skills,
  workspaceId,
}: TemplatesViewProps): ReactElement {
  const [catalogue, setCatalogue] = useState(skills);
  const [query, setQuery] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(skills[0]?.id ?? null);
  const [detail, setDetail] = useState<TaskSkillDetail | null>(null);
  const [preview, setPreview] = useState<TaskSkillApplyPreview | null>(null);
  const [previewInput, setPreviewInput] = useState<PreviewTaskSkillApplyInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback>(null);
  const selectionVersion = useRef(0);
  const rows = filterTemplateSkillRows(catalogue, query);
  const summary = buildTemplateSkillSummary(catalogue);
  const selectedSkill = catalogue.find((skill) => skill.id === selectedSkillId) ?? null;
  const isCurrentDetail = detail !== null && detail.id === selectedSkillId;
  const canMutate = client !== null && workspaceId !== null;

  const selectSkill = useCallback((skillId: string | null): void => {
    selectionVersion.current += 1;
    setSelectedSkillId(skillId);
    setDetail(null);
    setPreview(null);
    setPreviewInput(null);
    setFeedback(null);
    setBusy(false);
  }, []);

  useEffect(() => setCatalogue(skills), [skills]);

  useEffect(() => {
    if (selectedSkillId !== null && catalogue.some((skill) => skill.id === selectedSkillId)) {
      return;
    }

    selectSkill(catalogue[0]?.id ?? null);
  }, [catalogue, selectSkill, selectedSkillId]);

  useEffect(() => {
    if (client === null || workspaceId === null || selectedSkillId === null) {
      setDetail(null);
      return;
    }

    const requestSelectionVersion = selectionVersion.current;
    let cancelled = false;
    void client
      .getTaskSkill({ taskSkillId: selectedSkillId, workspaceId })
      .then((result) => {
        if (
          !cancelled &&
          shouldAcceptTaskSkillSettlement({
            currentSelectionVersion: selectionVersion.current,
            detailId: result.id,
            requestSelectionVersion,
            selectedSkillId,
          })
        ) {
          setDetail(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && selectionVersion.current === requestSelectionVersion) {
          setFeedback({ message: toErrorMessage(error), mode: "error" });
          setDetail(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, selectedSkillId, workspaceId]);

  async function refreshCatalogue(): Promise<void> {
    if (client === null || workspaceId === null) {
      return;
    }

    setCatalogue(await client.listTaskSkills({ workspaceId }));
  }

  async function runMutation(
    action: (requestSelectionVersion: number) => Promise<void>,
    successMessage: string,
  ): Promise<void> {
    const requestSelectionVersion = selectionVersion.current;
    setBusy(true);
    setFeedback(null);
    try {
      await action(requestSelectionVersion);
      await refreshCatalogue();
      if (selectionVersion.current === requestSelectionVersion) {
        setFeedback({ message: successMessage, mode: "info" });
      }
    } catch (error: unknown) {
      if (selectionVersion.current === requestSelectionVersion) {
        setFeedback({ message: toErrorMessage(error), mode: "error" });
      }
    } finally {
      if (selectionVersion.current === requestSelectionVersion) {
        setBusy(false);
      }
    }
  }

  return (
    <ContentGrid columns={3}>
      <WorkspacePanel
        action={
          <CreateTaskSkillForm
            busy={busy}
            canMutate={canMutate}
            onCreate={(body) =>
              runMutation(async (requestSelectionVersion) => {
                if (client === null || workspaceId === null) return;
                const created = await client.createTaskSkill({ body, workspaceId });
                if (selectionVersion.current === requestSelectionVersion) {
                  selectSkill(created.id);
                  setDetail(created);
                }
              }, "Task skill created.")
            }
          />
        }
        eyebrow="Templates"
        title="Task skills"
        titleId="templates-view-title"
      >
        <Flex align="stretch" direction="column" gap="md">
          <Input
            aria-label="Filter task skills"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Filter by name, alias, or description"
            value={query}
          />
          {rows.length === 0 ? <Text tone="muted">No task skills match this filter.</Text> : null}
          {rows.map((skill) => (
            <Flex align="start" gap="md" key={skill.id} justify="between">
              <Box>
                <Button
                  aria-pressed={skill.id === selectedSkillId}
                  onClick={() => selectSkill(skill.id)}
                  size="sm"
                  variant="ghost"
                >
                  {skill.name}
                </Button>
                <Text tone="muted">{skill.description ?? "No description"}</Text>
              </Box>
              <Text>{skill.aliasLabel}</Text>
            </Flex>
          ))}
        </Flex>
      </WorkspacePanel>

      <WorkspacePanel
        eyebrow="Skill detail"
        title="Selected task skill"
        titleId="template-detail-title"
      >
        {feedback === null ? null : (
          <Alert tone={feedback.mode === "error" ? "danger" : "info"}>{feedback.message}</Alert>
        )}
        {selectedSkill === null ? (
          <Text tone="muted">Select a task skill to manage it.</Text>
        ) : null}
        {selectedSkill !== null && !isCurrentDetail ? (
          <Text tone="muted">Loading task skill detail…</Text>
        ) : null}
        {!isCurrentDetail || detail === null ? null : (
          <Flex align="stretch" direction="column" gap="md">
            <Box>
              <Heading level={4}>{detail.name}</Heading>
              <Text tone="muted">{detail.description ?? "No description"}</Text>
              <Text>Versions: {detail.versions.length}</Text>
            </Box>
            <TaskSkillMetadataForm
              busy={busy}
              detail={detail}
              onSave={(body) =>
                runMutation(async (requestSelectionVersion) => {
                  if (client === null || workspaceId === null || detail.id !== selectedSkillId)
                    return;
                  const updated = await client.updateTaskSkillMetadata({
                    body,
                    taskSkillId: detail.id,
                    workspaceId,
                  });
                  if (
                    shouldAcceptTaskSkillSettlement({
                      currentSelectionVersion: selectionVersion.current,
                      detailId: updated.id,
                      requestSelectionVersion,
                      selectedSkillId: detail.id,
                    })
                  )
                    setDetail(updated);
                }, "Task skill metadata updated.")
              }
            />
            <TaskSkillDefinitionForm
              busy={busy}
              detail={detail}
              onSave={(body) =>
                runMutation(async (requestSelectionVersion) => {
                  if (client === null || workspaceId === null || detail.id !== selectedSkillId)
                    return;
                  const updated = await client.updateTaskSkillDefinition({
                    body,
                    taskSkillId: detail.id,
                    workspaceId,
                  });
                  if (
                    shouldAcceptTaskSkillSettlement({
                      currentSelectionVersion: selectionVersion.current,
                      detailId: updated.id,
                      requestSelectionVersion,
                      selectedSkillId: detail.id,
                    })
                  )
                    setDetail(updated);
                }, "Task skill definition saved as a new version.")
              }
            />
            <CloneTaskSkillForm
              busy={busy}
              detail={detail}
              onClone={(body) =>
                runMutation(async (requestSelectionVersion) => {
                  if (client === null || workspaceId === null || detail.id !== selectedSkillId)
                    return;
                  const cloned = await client.cloneTaskSkill({
                    body,
                    taskSkillId: detail.id,
                    workspaceId,
                  });
                  if (selectionVersion.current === requestSelectionVersion) {
                    selectSkill(cloned.id);
                    setDetail(cloned);
                  }
                }, "Task skill cloned.")
              }
            />
            <TaskSkillApplyPanel
              busy={busy}
              detail={detail}
              onApply={(body) =>
                runMutation(async (requestSelectionVersion) => {
                  if (client === null || workspaceId === null || detail.id !== selectedSkillId)
                    return;
                  const result = await client.applyTaskSkill({
                    body,
                    taskSkillId: detail.id,
                    workspaceId,
                  });
                  if (selectionVersion.current === requestSelectionVersion) {
                    setPreview(null);
                    setPreviewInput(null);
                    setFeedback({
                      message: `Created ${result.subtasks.length + 1} tasks from the skill.`,
                      mode: "info",
                    });
                  }
                }, "Task skill applied.")
              }
              onPreview={async (body) => {
                if (client === null || workspaceId === null || detail.id !== selectedSkillId)
                  return;
                const requestSelectionVersion = selectionVersion.current;
                setBusy(true);
                setFeedback(null);
                try {
                  const result = await client.previewTaskSkillApply({
                    body,
                    taskSkillId: detail.id,
                    workspaceId,
                  });
                  if (
                    shouldAcceptTaskSkillSettlement({
                      currentSelectionVersion: selectionVersion.current,
                      detailId: result.taskSkillId,
                      requestSelectionVersion,
                      selectedSkillId: detail.id,
                    })
                  ) {
                    setPreview(result);
                    setPreviewInput(body);
                  }
                } catch (error: unknown) {
                  if (selectionVersion.current === requestSelectionVersion) {
                    setFeedback({ message: toErrorMessage(error), mode: "error" });
                  }
                } finally {
                  if (selectionVersion.current === requestSelectionVersion) setBusy(false);
                }
              }}
              preview={preview}
              previewInput={previewInput}
              projects={projects}
            />
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() => {
                if (!window.confirm(`Archive task skill “${detail.name}”?`)) return;
                void runMutation(async (requestSelectionVersion) => {
                  if (client === null || workspaceId === null || detail.id !== selectedSkillId)
                    return;
                  await client.archiveTaskSkill({ taskSkillId: detail.id, workspaceId });
                  if (selectionVersion.current === requestSelectionVersion) selectSkill(null);
                }, "Task skill archived.");
              }}
            >
              Archive skill
            </Button>
          </Flex>
        )}
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Loaded skills" titleId="templates-summary-title">
        <WorkspaceMetrics
          items={[
            { label: "Skills", value: summary.skillCount },
            { label: "Aliases", value: summary.skillsWithAliasesCount },
            { label: "No description", value: summary.skillsWithoutDescriptionCount },
          ]}
        />
      </WorkspacePanel>
    </ContentGrid>
  );
}

function CreateTaskSkillForm({
  busy,
  canMutate,
  onCreate,
}: {
  busy: boolean;
  canMutate: boolean;
  onCreate(body: import("@task/api-client").CreateTaskSkillInput): Promise<void>;
}): ReactElement {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [aliases, setAliases] = useState("");
  const [subtasks, setSubtasks] = useState("");
  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onCreate(buildCreateTaskSkillInput({ aliases, description, name, subtasks }));
      }}
    >
      <Flex gap="sm">
        <Input
          aria-label="New skill name"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
          placeholder="New skill"
          value={name}
        />
        <Input
          aria-label="New skill subtasks"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setSubtasks(event.target.value)}
          placeholder="Subtasks, comma-separated"
          value={subtasks}
        />
        <Button
          disabled={
            !canMutate ||
            busy ||
            name.trim().length === 0 ||
            splitTaskSkillList(subtasks).length === 0
          }
          type="submit"
        >
          Create
        </Button>
      </Flex>
      <Input
        aria-label="New skill description"
        onChange={(event: ChangeEvent<HTMLInputElement>) => setDescription(event.target.value)}
        placeholder="Description"
        value={description}
      />
      <Input
        aria-label="New skill aliases"
        onChange={(event: ChangeEvent<HTMLInputElement>) => setAliases(event.target.value)}
        placeholder="Aliases, comma-separated"
        value={aliases}
      />
    </form>
  );
}

function TaskSkillMetadataForm({
  busy,
  detail,
  onSave,
}: {
  busy: boolean;
  detail: TaskSkillDetailDto;
  onSave(body: import("@task/api-client").UpdateTaskSkillMetadataInput): Promise<void>;
}): ReactElement {
  const [name, setName] = useState(detail.name);
  const [description, setDescription] = useState(detail.description ?? "");
  const [aliases, setAliases] = useState(detail.aliases.join(", "));
  useEffect(() => {
    setName(detail.name);
    setDescription(detail.description ?? "");
    setAliases(detail.aliases.join(", "));
  }, [detail]);
  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSave({
          aliases: splitTaskSkillList(aliases),
          description: description.trim() || null,
          name: name.trim(),
        });
      }}
    >
      <Heading level={4}>Metadata</Heading>
      <Input
        aria-label="Skill name"
        onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
        value={name}
      />
      <Input
        aria-label="Skill description"
        onChange={(event: ChangeEvent<HTMLInputElement>) => setDescription(event.target.value)}
        value={description}
      />
      <Input
        aria-label="Skill aliases"
        onChange={(event: ChangeEvent<HTMLInputElement>) => setAliases(event.target.value)}
        value={aliases}
      />
      <Button disabled={busy || name.trim().length === 0} type="submit">
        Save metadata
      </Button>
    </form>
  );
}

function TaskSkillDefinitionForm({
  busy,
  detail,
  onSave,
}: {
  busy: boolean;
  detail: TaskSkillDetailDto;
  onSave(body: import("@task/api-client").UpdateTaskSkillDefinitionInput): Promise<void>;
}): ReactElement {
  const current = detail.versions.at(-1);
  const initial = current === undefined ? "" : extractSubtaskTitles(current.definition).join(", ");
  const [subtasks, setSubtasks] = useState(initial);
  useEffect(() => setSubtasks(initial), [initial]);
  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSave({
          definition: { subtasks: splitTaskSkillList(subtasks).map((title) => ({ title })) },
        });
      }}
    >
      <Heading level={4}>Definition</Heading>
      <Input
        aria-label="Skill definition subtasks"
        onChange={(event: ChangeEvent<HTMLInputElement>) => setSubtasks(event.target.value)}
        placeholder="Subtasks, comma-separated"
        value={subtasks}
      />
      <Button disabled={busy || splitTaskSkillList(subtasks).length === 0} type="submit">
        Save new version
      </Button>
    </form>
  );
}

function CloneTaskSkillForm({
  busy,
  detail,
  onClone,
}: {
  busy: boolean;
  detail: TaskSkillDetailDto;
  onClone(body: import("@task/api-client").CloneTaskSkillInput): Promise<void>;
}): ReactElement {
  const [name, setName] = useState(`${detail.name} copy`);
  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onClone({
          aliases: detail.aliases,
          ...(detail.description === undefined ? {} : { description: detail.description }),
          name: name.trim(),
        });
      }}
    >
      <Heading level={4}>Clone</Heading>
      <Flex gap="sm">
        <Input
          aria-label="Clone skill name"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
          value={name}
        />
        <Button disabled={busy || name.trim().length === 0} type="submit">
          Clone skill
        </Button>
      </Flex>
    </form>
  );
}

function TaskSkillApplyPanel({
  busy,
  detail,
  onApply,
  onPreview,
  preview,
  previewInput,
  projects,
}: {
  busy: boolean;
  detail: TaskSkillDetailDto;
  onApply(body: PreviewTaskSkillApplyInput): Promise<void>;
  onPreview(body: PreviewTaskSkillApplyInput): Promise<void>;
  preview: TaskSkillApplyPreview | null;
  previewInput: PreviewTaskSkillApplyInput | null;
  projects: ProjectSummary[];
}): ReactElement {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [rootTaskTitle, setRootTaskTitle] = useState("");
  const [addedSubtasks, setAddedSubtasks] = useState("");
  const [removedSubtasks, setRemovedSubtasks] = useState("");
  const body = buildTaskSkillApplyInput({
    addedSubtasks,
    projectId,
    removedSubtasks,
    rootTaskTitle,
  });
  const options: RadixSelectOption[] = projects.map((project) => ({
    label: project.title,
    value: project.id,
  }));
  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onPreview(body);
      }}
    >
      <Heading level={4}>Preview and apply</Heading>
      <Select
        aria-label="Project for task skill"
        onValueChange={setProjectId}
        options={options}
        value={projectId}
      />
      <Input
        aria-label="Root task title"
        onChange={(event: ChangeEvent<HTMLInputElement>) => setRootTaskTitle(event.target.value)}
        placeholder="Root task title"
        value={rootTaskTitle}
      />
      <Input
        aria-label="Added subtasks"
        onChange={(event: ChangeEvent<HTMLInputElement>) => setAddedSubtasks(event.target.value)}
        placeholder="Additional subtasks, comma-separated"
        value={addedSubtasks}
      />
      <Input
        aria-label="Removed subtasks"
        onChange={(event: ChangeEvent<HTMLInputElement>) => setRemovedSubtasks(event.target.value)}
        placeholder="Remove skill subtasks, comma-separated"
        value={removedSubtasks}
      />
      <Button
        disabled={busy || projectId.length === 0 || rootTaskTitle.trim().length === 0}
        type="submit"
      >
        Preview apply
      </Button>
      {preview === null || previewInput === null || preview.taskSkillId !== detail.id ? null : (
        <Box>
          <Text>
            Version {preview.taskSkillVersion}:{" "}
            {preview.subtasks.map((subtask) => subtask.title).join(", ") || "No subtasks"}
          </Text>
          <Button
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Create ${preview.subtasks.length + 1} tasks from this preview?`))
                void onApply(previewInput);
            }}
          >
            Apply confirmed preview
          </Button>
        </Box>
      )}
    </form>
  );
}

function extractSubtaskTitles(definition: { subtasks?: unknown }): string[] {
  const { subtasks } = definition;
  if (!Array.isArray(subtasks)) return [];
  return subtasks.flatMap((subtask) =>
    typeof subtask === "object" &&
    subtask !== null &&
    "title" in subtask &&
    typeof subtask.title === "string"
      ? [subtask.title]
      : [],
  );
}
function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The task skill action could not be completed.";
}
