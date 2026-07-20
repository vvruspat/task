"use client";

import {
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  Popover,
  Select,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";
import type { TaskSummary } from "@task/api-client";
import {
  CalendarDays,
  Check,
  Circle,
  FolderKanban,
  GitBranch,
  Tags,
  UserRound,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { issueIdentifier } from "../lib/issue-url";
import { isTaskSummary } from "../lib/task-summary";
import { updateWorkspaceTask } from "../lib/use-workspace-data";
import type { WorkspaceBootstrap } from "../lib/workspace-contracts";
import { workspaceIssueHref } from "../lib/workspace-url";
import { MarkdownDescriptionEditor } from "./markdown-description-editor";
import { TaskActivity } from "./task-activity";

type EditableTextField = "due-date" | "title";

type TaskMutation =
  | {
      operation: "details";
      title?: string;
      description?: string | null;
      metadata?: Record<string, unknown>;
    }
  | { operation: "status"; statusId: string | null }
  | { operation: "assignee"; assigneeUserId: string | null }
  | { operation: "due-date"; dueAt: string | null };

export function TaskDetailsContent({
  data,
  identifier,
  portalContainer,
  task,
  onTaskUpdated,
}: Readonly<{
  data: WorkspaceBootstrap | null;
  identifier: string;
  portalContainer?: HTMLElement | null;
  task: TaskSummary;
  onTaskUpdated?: (task: TaskSummary) => void;
}>): ReactNode {
  const [currentTask, setCurrentTask] = useState(task);
  const [editing, setEditing] = useState<EditableTextField | null>(null);
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(formatDateInput(task.dueAt));
  const [labelQuery, setLabelQuery] = useState("");
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTask(task);
    setTitle(task.title);
    setDueDate(formatDateInput(task.dueAt));
  }, [task]);

  const project = data?.projects.find((item) => item.id === currentTask.projectId);
  const projectContext = data?.projectData.find((item) => item.projectId === currentTask.projectId);
  const projectStatuses =
    data?.statuses.filter((item) => item.projectId === currentTask.projectId) ?? [];
  const status = projectStatuses.find((item) => item.id === currentTask.statusId);
  const sourceTemplate = data?.taskSkills.find((item) => item.id === currentTask.sourceSkillId);
  const projectTasks = useMemo(
    () => data?.projectData.find((item) => item.projectId === currentTask.projectId)?.tasks ?? [],
    [currentTask.projectId, data?.projectData],
  );
  const parentTask = projectTasks.find((item) => item.id === currentTask.parentTaskId);
  const subtasks = projectTasks.filter((item) => item.parentTaskId === currentTask.id);
  const workspaceLabels = useMemo(() => collectWorkspaceLabels(data), [data]);
  const selectedLabels = readTaskLabels(currentTask);
  const filteredLabels = workspaceLabels.filter((label) =>
    label.toLocaleLowerCase("ru").includes(labelQuery.trim().toLocaleLowerCase("ru")),
  );

  const mutate = async (mutation: TaskMutation): Promise<void> => {
    if (saving) return;
    setSaving(true);
    setMutationError(null);
    try {
      const response = await fetch(`/api/workspace/tasks/${currentTask.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...mutation,
          projectId: currentTask.projectId,
          workspaceId: currentTask.workspaceId,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok || !isTaskSummary(body)) {
        throw new Error(readMutationError(body));
      }
      setCurrentTask(body);
      setTitle(body.title);
      setDueDate(formatDateInput(body.dueAt));
      onTaskUpdated?.(body);
      updateWorkspaceTask(body);
    } catch (error: unknown) {
      setMutationError(error instanceof Error ? error.message : "Не удалось сохранить задачу.");
    } finally {
      setSaving(false);
    }
  };

  const saveTitle = async (): Promise<void> => {
    const nextTitle = title.trim();
    setEditing(null);
    if (nextTitle.length === 0) {
      setTitle(currentTask.title);
      return;
    }
    if (nextTitle !== currentTask.title) await mutate({ operation: "details", title: nextTitle });
  };
  const updateLabels = async (nextLabels: string[]): Promise<void> => {
    if (sameStrings(nextLabels, selectedLabels)) return;
    await mutate({
      metadata: { ...currentTask.metadata, labels: nextLabels },
      operation: "details",
    });
  };
  const toggleLabel = async (label: string): Promise<void> => {
    const nextLabels = selectedLabels.some((selected) => sameLabel(selected, label))
      ? selectedLabels.filter((selected) => !sameLabel(selected, label))
      : [...selectedLabels, label];
    await updateLabels(nextLabels);
  };
  const createLabel = async (): Promise<void> => {
    const nextLabel = labelQuery.trim();
    if (nextLabel.length === 0) return;
    const existingLabel = workspaceLabels.find((label) => sameLabel(label, nextLabel));
    const label = existingLabel ?? nextLabel;
    if (!selectedLabels.some((selected) => sameLabel(selected, label))) {
      await updateLabels([...selectedLabels, label]);
    }
    setLabelQuery("");
  };
  const saveDueDate = async (): Promise<void> => {
    setEditing(null);
    const nextDueAt = dueDate.length === 0 ? null : `${dueDate}T00:00:00.000Z`;
    if (nextDueAt !== currentTask.dueAt) await mutate({ dueAt: nextDueAt, operation: "due-date" });
  };

  return (
    <Flex className="issue-details-content" direction="column" gap="4">
      <Card className="issue-summary-card">
        <Flex className="issue-page" gap="8" align="start">
          <Box className="issue-main">
            <Text size="2" color="gray">
              {identifier}
            </Text>
            <Heading as="h1" size="7">
              {editing === "title" ? (
                <TextField.Root
                  autoFocus
                  className="issue-title-input"
                  disabled={saving}
                  value={title}
                  onBlur={() => void saveTitle()}
                  onChange={(event) => setTitle(event.target.value)}
                  onKeyDown={blurOnEnter}
                />
              ) : (
                <button
                  className="inline-edit issue-title-trigger"
                  type="button"
                  onClick={() => setEditing("title")}
                >
                  {currentTask.title}
                </button>
              )}
            </Heading>
            <MarkdownDescriptionEditor
              ariaLabel="Редактировать описание задачи"
              className="issue-description"
              emptyText="Описание не добавлено"
              value={currentTask.description ?? null}
              onSave={(nextDescription) =>
                mutate({ description: nextDescription, operation: "details" })
              }
            />

            {subtasks.length > 0 && data !== null && project !== undefined && (
              <Box className="issue-subtasks">
                <Separator size="4" />
                <Flex align="center" justify="between">
                  <Text size="2" weight="bold">
                    Подзадачи
                  </Text>
                  <Badge color="gray">{subtasks.length}</Badge>
                </Flex>
                <Flex direction="column" gap="1">
                  {subtasks.map((subtask) => {
                    const subtaskStatus = projectStatuses.find(
                      (item) => item.id === subtask.statusId,
                    );
                    return (
                      <Link
                        className="issue-subtask-link"
                        href={workspaceIssueHref(
                          data.workspace.slug,
                          project.key,
                          subtask.number,
                          subtask.title,
                        )}
                        key={subtask.id}
                      >
                        <Circle
                          size={13}
                          color={subtaskStatus?.color}
                          fill={subtaskStatus?.color ?? "transparent"}
                        />
                        <span>{subtask.title}</span>
                        <small>{issueIdentifier(project.key, subtask.number)}</small>
                      </Link>
                    );
                  })}
                </Flex>
              </Box>
            )}
          </Box>

          <Box className="issue-properties">
            <Text size="2" weight="bold">
              Свойства
            </Text>
            <Separator size="4" />
            <Property
              icon={
                <Circle size={15} color={status?.color} fill={status?.color ?? "transparent"} />
              }
              label="Статус"
            >
              <Select.Root
                disabled={saving || data === null}
                value={currentTask.statusId ?? "none"}
                onValueChange={(statusId) =>
                  void mutate({
                    operation: "status",
                    statusId: statusId === "none" ? null : statusId,
                  })
                }
              >
                <Select.Trigger className="inline-property-select" variant="ghost" />
                <Select.Content container={portalContainer ?? undefined}>
                  <Select.Item value="none">Без статуса</Select.Item>
                  {projectStatuses.map((item) => (
                    <Select.Item key={item.id} value={item.id}>
                      {item.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Property>
            <Property icon={<UserRound size={15} />} label="Исполнитель">
              <Select.Root
                disabled={saving || data === null}
                value={currentTask.assigneeUserId ?? "none"}
                onValueChange={(assigneeUserId) =>
                  void mutate({
                    assigneeUserId: assigneeUserId === "none" ? null : assigneeUserId,
                    operation: "assignee",
                  })
                }
              >
                <Select.Trigger className="inline-property-select" variant="ghost" />
                <Select.Content container={portalContainer ?? undefined}>
                  <Select.Item value="none">Не назначен</Select.Item>
                  {data?.workspace.members.map((member) => (
                    <Select.Item key={member.userId} value={member.userId}>
                      {member.displayName}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Property>
            <Property icon={<CalendarDays size={15} />} label="Срок">
              {editing === "due-date" ? (
                <TextField.Root
                  autoFocus
                  className="inline-property-input"
                  disabled={saving}
                  type="date"
                  value={dueDate}
                  onBlur={() => void saveDueDate()}
                  onChange={(event) => setDueDate(event.target.value)}
                  onKeyDown={blurOnEnter}
                />
              ) : (
                <button
                  className="inline-edit inline-property-trigger"
                  type="button"
                  onClick={() => setEditing("due-date")}
                >
                  {formatDateLabel(currentTask.dueAt)}
                </button>
              )}
            </Property>
            <Property icon={<Tags size={15} />} label="Labels">
              <Popover.Root
                open={labelsOpen}
                onOpenChange={(open) => {
                  setLabelsOpen(open);
                  if (!open) setLabelQuery("");
                }}
              >
                <Popover.Trigger>
                  <button className="label-autocomplete-trigger" type="button">
                    {selectedLabels.length === 0 ? (
                      <span>Добавить labels</span>
                    ) : (
                      selectedLabels.map((label) => <Badge key={label}>{label}</Badge>)
                    )}
                  </button>
                </Popover.Trigger>
                <Popover.Content
                  align="end"
                  className="label-autocomplete"
                  container={portalContainer ?? undefined}
                  sideOffset={6}
                >
                  <TextField.Root
                    autoFocus
                    disabled={saving}
                    placeholder="Найти или создать label…"
                    value={labelQuery}
                    onChange={(event) => setLabelQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      void createLabel();
                    }}
                  />
                  {selectedLabels.length > 0 && (
                    <Flex className="selected-labels" gap="1" wrap="wrap">
                      {selectedLabels.map((label) => (
                        <button
                          aria-label={`Удалить label ${label}`}
                          disabled={saving}
                          key={label}
                          type="button"
                          onClick={() => void toggleLabel(label)}
                        >
                          <Badge>
                            {label}
                            <X size={11} />
                          </Badge>
                        </button>
                      ))}
                    </Flex>
                  )}
                  <div className="label-options">
                    {filteredLabels.map((label) => {
                      const selected = selectedLabels.some((item) => sameLabel(item, label));
                      return (
                        <button
                          disabled={saving}
                          key={label}
                          type="button"
                          onClick={() => void toggleLabel(label)}
                        >
                          <span>{label}</span>
                          {selected && <Check size={14} />}
                        </button>
                      );
                    })}
                    {canCreateLabel(labelQuery, workspaceLabels) && (
                      <button disabled={saving} type="button" onClick={() => void createLabel()}>
                        <span>Создать “{labelQuery.trim()}”</span>
                        <kbd>Enter</kbd>
                      </button>
                    )}
                    {filteredLabels.length === 0 &&
                      !canCreateLabel(labelQuery, workspaceLabels) && (
                        <Text size="1" color="gray">
                          Подходящих labels нет
                        </Text>
                      )}
                  </div>
                </Popover.Content>
              </Popover.Root>
            </Property>
            <Property icon={<FolderKanban size={15} />} label="Проект">
              <Text size="2" weight="medium">
                {projectContext?.projectless === true
                  ? "Без проекта"
                  : (project?.title ?? "Неизвестный проект")}
              </Text>
            </Property>
            {parentTask !== undefined && data !== null && project !== undefined && (
              <Property icon={<GitBranch size={15} />} label="Родитель">
                <Link
                  className="issue-property-link"
                  href={workspaceIssueHref(
                    data.workspace.slug,
                    project.key,
                    parentTask.number,
                    parentTask.title,
                  )}
                >
                  {issueIdentifier(project.key, parentTask.number)} · {parentTask.title}
                </Link>
              </Property>
            )}
            {sourceTemplate !== undefined && (
              <Property icon={<Workflow size={15} />} label="Шаблон">
                <Text size="2" weight="medium">
                  {sourceTemplate.name}
                </Text>
              </Property>
            )}
            {currentTask.parentTaskId !== null && currentTask.parentTaskId !== undefined && (
              <Badge color="gray" variant="soft">
                Подзадача
              </Badge>
            )}
            {saving && (
              <Text size="1" color="gray">
                Сохраняю…
              </Text>
            )}
            {mutationError !== null && (
              <Text size="1" color="red">
                {mutationError}
              </Text>
            )}
          </Box>
        </Flex>
      </Card>
      <TaskActivity data={data} task={currentTask} />
    </Flex>
  );
}

function Property({
  children,
  icon,
  label,
}: Readonly<{ children: ReactNode; icon: ReactNode; label: string }>): ReactNode {
  return (
    <Flex className="issue-property" gap="3" align="center">
      {icon}
      <Text size="2" color="gray">
        {label}
      </Text>
      <Box className="issue-property-value">{children}</Box>
    </Flex>
  );
}

function readTaskLabels(task: TaskSummary): string[] {
  // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
  const labels = task.metadata["labels"];
  return Array.isArray(labels)
    ? labels.filter((label): label is string => typeof label === "string")
    : [];
}

function collectWorkspaceLabels(data: WorkspaceBootstrap | null): string[] {
  if (data === null) return [];
  const labels = data.projectData.flatMap((project) =>
    project.tasks.flatMap((task) => readTaskLabels(task)),
  );
  const uniqueLabels = new Map<string, string>();
  for (const label of labels) {
    const key = label.toLocaleLowerCase("ru");
    if (!uniqueLabels.has(key)) uniqueLabels.set(key, label);
  }
  return [...uniqueLabels.values()].sort((left, right) => left.localeCompare(right, "ru"));
}

function canCreateLabel(query: string, workspaceLabels: string[]): boolean {
  const label = query.trim();
  return label.length > 0 && !workspaceLabels.some((existing) => sameLabel(existing, label));
}

function sameLabel(left: string, right: string): boolean {
  return left.localeCompare(right, "ru", { sensitivity: "accent" }) === 0;
}

function sameStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function formatDateInput(value: string | null | undefined): string {
  return value?.slice(0, 10) ?? "";
}

function formatDateLabel(value: string | null | undefined): string {
  return value === null || value === undefined
    ? "Добавить срок"
    : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(value),
      );
}

function blurOnEnter(event: KeyboardEvent<HTMLInputElement>): void {
  if (event.key === "Enter") event.currentTarget.blur();
}

function readMutationError(value: unknown): string {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : "Не удалось сохранить задачу.";
}
