"use client";

import "./create-dialog.css";
import * as Dialog from "@radix-ui/react-dialog";
import { Button, IconButton, Popover, Select, TextArea, TextField } from "@radix-ui/themes";
import type { TaskSummary } from "@task/api-client";
import {
  Check,
  ChevronRight,
  FolderKanban,
  Layers3,
  ListTodo,
  Plus,
  Tags,
  UserRound,
  Workflow,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { isTaskSummary } from "../lib/task-summary";
import { useWorkspaceData } from "../lib/use-workspace-data";
import type { WorkspaceBootstrap } from "../lib/workspace-contracts";
import { useWorkspaceStore } from "../lib/workspace-store";
import { workspaceIssueHref } from "../lib/workspace-url";
import { TaskStatusIndicator } from "./task-status-indicator";

type CreateKind = "project" | "skill" | "task";
const noProjectValue = "none";
const unassignedValue = "none";
const defaultStatusValue = "default";

export function CreateDialog(): ReactNode {
  const router = useRouter();
  const open = useWorkspaceStore((state) => state.createOpen);
  const setOpen = useWorkspaceStore((state) => state.setCreateOpen);
  const selectedProjectId = useWorkspaceStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useWorkspaceStore((state) => state.setSelectedProjectId);
  const { data, refresh } = useWorkspaceData();
  const [kind, setKind] = useState<CreateKind>("task");
  const [projectValue, setProjectValue] = useState(noProjectValue);
  const [statusValue, setStatusValue] = useState(defaultStatusValue);
  const [assigneeValue, setAssigneeValue] = useState(unassignedValue);
  const [labels, setLabels] = useState<string[]>([]);
  const [labelQuery, setLabelQuery] = useState("");
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const workspaceLabels = useMemo(() => collectWorkspaceLabels(data), [data]);
  const statusOptions = useMemo(() => getStatusOptions(data, projectValue), [data, projectValue]);
  const resolvedStatusValue = statusOptions.some((status) => status.id === statusValue)
    ? statusValue
    : getDefaultStatusFromOptions(statusOptions);
  const selectedStatus = statusOptions.find((status) => status.id === resolvedStatusValue);

  useEffect(() => {
    if (!open) return;
    const storedProjectExists =
      selectedProjectId !== null &&
      data?.projects.some((project) => project.id === selectedProjectId) === true;
    const nextProjectValue = storedProjectExists ? selectedProjectId : noProjectValue;
    setProjectValue(nextProjectValue);
    setStatusValue(getDefaultStatusValue(data, nextProjectValue));
    setError(null);
  }, [data, open, selectedProjectId]);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (data === null || normalizedTitle.length === 0) return;
    const projectId = projectValue === noProjectValue ? null : projectValue;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/workspace/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          title: normalizedTitle,
          description,
          workspaceId: data.workspace.id,
          ...(kind === "task"
            ? {
                assigneeUserId: assigneeValue === unassignedValue ? null : assigneeValue,
                labels,
                projectId,
                statusId: resolvedStatusValue === defaultStatusValue ? null : resolvedStatusValue,
              }
            : {}),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readCreateError(body));
        return;
      }
      const createdTask = kind === "task" ? readCreatedTask(body) : null;
      if (kind === "task" && createdTask === null) {
        setError("Задача создана, но сервер вернул некорректный адрес.");
        return;
      }
      if (kind === "task" && projectId !== null) setSelectedProjectId(projectId);
      await refresh();
      setTitle("");
      setDescription("");
      setAssigneeValue(unassignedValue);
      setStatusValue(defaultStatusValue);
      setLabels([]);
      setLabelQuery("");
      setOpen(false);
      if (createdTask !== null) {
        router.push(
          workspaceIssueHref(
            data.workspace.slug,
            createdTask.projectKey,
            createdTask.number,
            createdTask.title,
          ),
        );
      }
    } catch {
      setError("Не удалось создать объект.");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = createDialogCopy(kind);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="create-dialog-overlay" />
        <Dialog.Content className="create-dialog">
          <div className="create-dialog-heading">
            <div className="create-dialog-context">
              <Select.Root
                value={kind}
                onValueChange={(value) => {
                  if (isCreateKind(value)) setKind(value);
                }}
              >
                <Select.Trigger className="create-kind-trigger" variant="ghost" />
                <Select.Content className="create-dialog-select-content">
                  <Select.Item value="task">
                    <span className="create-select-option">
                      <ListTodo size={14} /> <span>Issue</span>
                    </span>
                  </Select.Item>
                  <Select.Item value="project">
                    <span className="create-select-option">
                      <FolderKanban size={14} /> <span>Проект</span>
                    </span>
                  </Select.Item>
                  <Select.Item value="skill">
                    <span className="create-select-option">
                      <Workflow size={14} /> <span>Шаблон</span>
                    </span>
                  </Select.Item>
                </Select.Content>
              </Select.Root>
              <ChevronRight aria-hidden="true" className="create-context-separator" size={14} />
              <span className="create-context-label">{copy.contextLabel}</span>
            </div>
            <Dialog.Close asChild>
              <IconButton aria-label="Закрыть" color="gray" size="1" variant="ghost">
                <X size={16} />
              </IconButton>
            </Dialog.Close>
          </div>

          <Dialog.Title className="create-dialog-accessible-title">
            {copy.titlePlaceholder}
          </Dialog.Title>

          <form onSubmit={(event) => void submit(event)}>
            <TextField.Root
              autoFocus
              className="create-title-input"
              placeholder={copy.titlePlaceholder}
              size="3"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <TextArea
              className="create-description-input"
              placeholder="Добавить описание…"
              resize="vertical"
              size="2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            {error !== null && <p className="form-error">{error}</p>}
            {kind === "task" && (
              <div className="create-property-row">
                <Select.Root value={resolvedStatusValue} onValueChange={setStatusValue}>
                  <Select.Trigger className="create-property-trigger" variant="soft">
                    <span className="create-select-option">
                      <TaskStatusIndicator color={selectedStatus?.color} size="sm" />
                      <span>{selectedStatus?.name ?? "Backlog"}</span>
                    </span>
                  </Select.Trigger>
                  <Select.Content className="create-dialog-select-content">
                    {statusOptions.length === 0 ? (
                      <Select.Item value={defaultStatusValue}>
                        <span className="create-select-option">
                          <TaskStatusIndicator size="sm" /> <span>Backlog</span>
                        </span>
                      </Select.Item>
                    ) : (
                      statusOptions.map((status) => (
                        <Select.Item key={status.id} value={status.id}>
                          <span className="create-select-option">
                            <TaskStatusIndicator color={status.color} size="sm" />
                            <span>{status.name}</span>
                          </span>
                        </Select.Item>
                      ))
                    )}
                  </Select.Content>
                </Select.Root>
                <Select.Root
                  value={projectValue}
                  onValueChange={(value) => {
                    setProjectValue(value);
                    setStatusValue(getDefaultStatusValue(data, value));
                  }}
                >
                  <Select.Trigger className="create-project-trigger" variant="soft" />
                  <Select.Content className="create-dialog-select-content">
                    <Select.Item value={noProjectValue}>
                      <span className="create-select-option">
                        <Layers3 size={14} /> <span>Без проекта</span>
                      </span>
                    </Select.Item>
                    {data?.projects.map((project) => (
                      <Select.Item key={project.id} value={project.id}>
                        <span className="create-select-option">
                          <FolderKanban size={14} /> <span>{project.title}</span>
                        </span>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Select.Root value={assigneeValue} onValueChange={setAssigneeValue}>
                  <Select.Trigger className="create-property-trigger" variant="soft" />
                  <Select.Content className="create-dialog-select-content">
                    <Select.Item value={unassignedValue}>
                      <span className="create-select-option">
                        <UserRound size={14} /> <span>Не назначен</span>
                      </span>
                    </Select.Item>
                    {data?.workspace.members.map((member) => (
                      <Select.Item key={member.userId} value={member.userId}>
                        <span className="create-select-option">
                          <UserRound size={14} /> <span>{member.displayName}</span>
                        </span>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Popover.Root open={labelsOpen} onOpenChange={setLabelsOpen}>
                  <Popover.Trigger>
                    <Button
                      className="create-label-trigger"
                      color="gray"
                      type="button"
                      variant="soft"
                    >
                      <Tags size={14} />
                      {labels.length === 0 ? "Labels" : labels.join(", ")}
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content className="create-label-popover" align="start" size="1">
                    <TextField.Root
                      autoFocus
                      placeholder="Найти или создать label…"
                      value={labelQuery}
                      onChange={(event) => setLabelQuery(event.target.value)}
                      onKeyDown={(event) =>
                        handleLabelKeyDown(event, labelQuery, labels, setLabels, setLabelQuery)
                      }
                    />
                    <div className="create-label-options">
                      {filterLabels(workspaceLabels, labelQuery).map((label) => {
                        const selected = labels.some((item) => sameLabel(item, label));
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setLabels(toggleLabel(labels, label))}
                          >
                            <span>{label}</span>
                            {selected && <Check aria-hidden="true" size={14} />}
                          </button>
                        );
                      })}
                      {canCreateLabel(labelQuery, workspaceLabels) && (
                        <button
                          type="button"
                          onClick={() => {
                            setLabels(toggleLabel(labels, labelQuery.trim()));
                            setLabelQuery("");
                          }}
                        >
                          <Plus aria-hidden="true" size={14} />
                          Создать «{labelQuery.trim()}»
                        </button>
                      )}
                    </div>
                  </Popover.Content>
                </Popover.Root>
              </div>
            )}
            <div className="create-dialog-footer">
              <span className="create-shortcut-hint">Enter — создать</span>
              <div className="dialog-actions">
                <Button type="submit" disabled={submitting || title.trim().length === 0}>
                  <Plus size={14} />
                  {submitting ? "Создаю…" : copy.action}
                </Button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function collectWorkspaceLabels(data: ReturnType<typeof useWorkspaceData>["data"]): string[] {
  if (data === null) return [];
  const labels = data.projectData.flatMap((project) =>
    project.tasks.flatMap((task) => {
      const value = task.metadata["labels"];
      return Array.isArray(value)
        ? value.filter((label): label is string => typeof label === "string")
        : [];
    }),
  );
  const unique = new Map<string, string>();
  for (const label of labels) {
    const key = label.toLocaleLowerCase("ru");
    if (!unique.has(key)) unique.set(key, label);
  }
  return [...unique.values()].sort((left, right) => left.localeCompare(right, "ru"));
}

function getStatusOptions(
  data: WorkspaceBootstrap | null,
  projectValue: string,
): WorkspaceBootstrap["statuses"] {
  if (data === null) return [];
  const projectId =
    projectValue === noProjectValue
      ? data.projectData.find((project) => project.projectless)?.projectId
      : projectValue;
  if (projectId === undefined) return [];
  return data.statuses
    .filter((status) => status.projectId === projectId)
    .sort((left, right) => Number(left.position) - Number(right.position));
}

function getDefaultStatusValue(data: WorkspaceBootstrap | null, projectValue: string): string {
  return getDefaultStatusFromOptions(getStatusOptions(data, projectValue));
}

function getDefaultStatusFromOptions(statuses: WorkspaceBootstrap["statuses"]): string {
  const backlog = statuses.find(
    (status) => status.name.trim().toLocaleLowerCase("ru") === "backlog",
  );
  return backlog?.id ?? statuses.at(0)?.id ?? defaultStatusValue;
}

function filterLabels(labels: string[], query: string): string[] {
  const normalized = query.trim().toLocaleLowerCase("ru");
  return labels.filter((label) => label.toLocaleLowerCase("ru").includes(normalized));
}

function sameLabel(left: string, right: string): boolean {
  return left.localeCompare(right, "ru", { sensitivity: "accent" }) === 0;
}

function toggleLabel(labels: string[], label: string): string[] {
  return labels.some((item) => sameLabel(item, label))
    ? labels.filter((item) => !sameLabel(item, label))
    : [...labels, label];
}

function canCreateLabel(query: string, labels: string[]): boolean {
  const value = query.trim();
  return value.length > 0 && !labels.some((label) => sameLabel(label, value));
}

function handleLabelKeyDown(
  event: KeyboardEvent<HTMLInputElement>,
  query: string,
  labels: string[],
  setLabels: (labels: string[]) => void,
  setQuery: (query: string) => void,
): void {
  if (event.key !== "Enter" || query.trim().length === 0) return;
  event.preventDefault();
  setLabels(toggleLabel(labels, query.trim()));
  setQuery("");
}

function isCreateKind(value: string): value is CreateKind {
  return value === "project" || value === "skill" || value === "task";
}

function readCreateError(value: unknown): string {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : "Не удалось создать объект.";
}

function readCreatedTask(value: unknown): (TaskSummary & { projectKey: string }) | null {
  return isTaskSummary(value) &&
    "projectKey" in value &&
    typeof value.projectKey === "string" &&
    value.projectKey.length > 0
    ? { ...value, projectKey: value.projectKey }
    : null;
}

function createDialogCopy(kind: CreateKind): {
  action: string;
  contextLabel: string;
  titlePlaceholder: string;
} {
  if (kind === "project") {
    return {
      action: "Создать проект",
      contextLabel: "Новый проект",
      titlePlaceholder: "Новый проект",
    };
  }
  if (kind === "skill") {
    return {
      action: "Создать шаблон",
      contextLabel: "Новый шаблон",
      titlePlaceholder: "Новый шаблон",
    };
  }
  return {
    action: "Создать issue",
    contextLabel: "New issue",
    titlePlaceholder: "Новый issue",
  };
}
