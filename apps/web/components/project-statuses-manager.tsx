"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Card, Flex, IconButton, Text, TextField } from "@radix-ui/themes";
import type { WorkspaceStatus } from "@task/api-client";
import { GripVertical, Plus, Save, Trash2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import { updateProjectStatuses } from "../lib/use-workspace-data";

type ProjectStatusesManagerProps = {
  projectId: string;
  statuses: WorkspaceStatus[];
  workspaceId: string;
};

export function ProjectStatusesManager({
  projectId,
  statuses,
  workspaceId,
}: Readonly<ProjectStatusesManagerProps>): ReactNode {
  const { t } = useI18n();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#A1A1AA");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orderedStatuses, setOrderedStatuses] = useState(statuses);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => setOrderedStatuses(statuses), [statuses]);
  const nextPosition = useMemo(
    () =>
      String(
        orderedStatuses.reduce((maximum, status) => {
          const position = Number(status.position);
          return Number.isFinite(position) ? Math.max(maximum, position) : maximum;
        }, 0) + 1000,
      ),
    [orderedStatuses],
  );

  async function persistOrder(nextStatuses: WorkspaceStatus[]): Promise<void> {
    if (busy || nextStatuses.every((status, index) => status.id === orderedStatuses[index]?.id)) {
      return;
    }
    const previous = orderedStatuses;
    setOrderedStatuses(nextStatuses);
    setBusy(true);
    setError(null);
    const response = await fetch(statusReorderUrl(workspaceId, projectId), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statusIds: nextStatuses.map((status) => status.id) }),
    });
    if (!response.ok) {
      setOrderedStatuses(previous);
      setError(await readError(response, t("statuses.reorderError")));
      setBusy(false);
      return;
    }
    const body: unknown = await response.json();
    if (!isWorkspaceStatusList(body)) {
      setOrderedStatuses(previous);
      setError(t("statuses.invalidOrder"));
      setBusy(false);
      return;
    }
    setOrderedStatuses(body);
    updateProjectStatuses(projectId, body);
    setBusy(false);
  }

  function finishDrag(event: DragEndEvent): void {
    if (event.over === null || event.active.id === event.over.id) return;
    const sourceIndex = orderedStatuses.findIndex((status) => status.id === event.active.id);
    const targetIndex = orderedStatuses.findIndex((status) => status.id === event.over?.id);
    if (sourceIndex < 0 || targetIndex < 0) return;
    void persistOrder(arrayMove(orderedStatuses, sourceIndex, targetIndex));
  }

  async function createStatus(): Promise<void> {
    if (newName.trim().length === 0) return;
    setBusy(true);
    setError(null);
    const response = await fetch(statusCollectionUrl(workspaceId, projectId), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        color: newColor,
        position: nextPosition,
        isDone: isDoneStatusName(newName),
      }),
    });
    if (!response.ok) {
      setError(await readError(response, t("statuses.createError")));
      setBusy(false);
      return;
    }
    const body: unknown = await response.json();
    if (!isWorkspaceStatus(body)) {
      setError(t("statuses.invalid"));
      setBusy(false);
      return;
    }
    const nextStatuses = [...orderedStatuses, body];
    setOrderedStatuses(nextStatuses);
    updateProjectStatuses(projectId, nextStatuses);
    setNewName("");
    setBusy(false);
  }

  return (
    <Card className="panel">
      <Flex direction="column" gap="4">
        <div>
          <Text as="div" size="3" weight="bold">
            {t("statuses.title")}
          </Text>
          <Text as="div" size="2" color="gray">
            {t("statuses.subtitle")}
          </Text>
        </div>
        <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={finishDrag}>
          <SortableContext
            items={orderedStatuses.map((status) => status.id)}
            strategy={verticalListSortingStrategy}
          >
            <Flex asChild direction="column" gap="2">
              <ul className="project-status-list">
                {orderedStatuses.map((status) => (
                  <SortableProjectStatusRow
                    busy={busy}
                    key={status.id}
                    projectId={projectId}
                    onStatusChanged={(nextStatus) => {
                      const nextStatuses =
                        nextStatus === null
                          ? orderedStatuses.filter((item) => item.id !== status.id)
                          : orderedStatuses.map((item) =>
                              item.id === nextStatus.id ? nextStatus : item,
                            );
                      setOrderedStatuses(nextStatuses);
                      updateProjectStatuses(projectId, nextStatuses);
                    }}
                    reportError={setError}
                    status={status}
                    workspaceId={workspaceId}
                  />
                ))}
              </ul>
            </Flex>
          </SortableContext>
        </DndContext>
        <Flex align="center" gap="2" wrap="wrap">
          <input
            className="status-color-input"
            type="color"
            aria-label={t("statuses.newColor")}
            value={newColor}
            onChange={(event) => setNewColor(event.target.value)}
          />
          <TextField.Root
            aria-label={t("statuses.newName")}
            placeholder={t("statuses.new")}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <Button
            disabled={busy || newName.trim().length === 0}
            onClick={() => void createStatus()}
          >
            <Plus size={14} /> {t("common.add")}
          </Button>
        </Flex>
        {error !== null && (
          <Text color="red" size="2">
            {error}
          </Text>
        )}
      </Flex>
    </Card>
  );
}

function SortableProjectStatusRow({
  busy,
  status,
  workspaceId,
  projectId,
  onStatusChanged,
  reportError,
}: Readonly<{
  busy: boolean;
  status: WorkspaceStatus;
  workspaceId: string;
  projectId: string;
  onStatusChanged: (status: WorkspaceStatus | null) => void;
  reportError: (message: string | null) => void;
}>): ReactNode {
  const { t } = useI18n();
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: status.id, disabled: busy });
  const style: CSSProperties = {
    opacity: isDragging ? 0.45 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <li className="project-status-row" ref={setNodeRef} style={style}>
      <ProjectStatusRow
        status={status}
        workspaceId={workspaceId}
        projectId={projectId}
        onStatusChanged={onStatusChanged}
        reportError={reportError}
        dragHandle={
          <IconButton
            {...attributes}
            {...listeners}
            aria-label={t("statuses.reorder", { name: status.name })}
            disabled={busy}
            ref={setActivatorNodeRef}
            variant="ghost"
          >
            <GripVertical size={16} />
          </IconButton>
        }
      />
    </li>
  );
}

function ProjectStatusRow({
  status,
  workspaceId,
  projectId,
  onStatusChanged,
  reportError,
  dragHandle,
}: Readonly<{
  status: WorkspaceStatus;
  workspaceId: string;
  projectId: string;
  onStatusChanged: (status: WorkspaceStatus | null) => void;
  reportError: (message: string | null) => void;
  dragHandle: ReactNode;
}>): ReactNode {
  const { t } = useI18n();
  const [name, setName] = useState(status.name);
  const [color, setColor] = useState(status.color);
  const [busy, setBusy] = useState(false);
  const required = isRequiredStatusName(status.name);
  const changed = name.trim() !== status.name || color.toLowerCase() !== status.color.toLowerCase();

  useEffect(() => {
    setName(status.name);
    setColor(status.color);
  }, [status.color, status.name]);

  async function save(): Promise<void> {
    if (!changed || name.trim().length === 0) return;
    await mutate("PATCH", { name: name.trim(), color, isDone: status.isDone });
  }

  async function remove(): Promise<void> {
    await mutate("DELETE", null);
  }

  async function mutate(method: "DELETE" | "PATCH", body: object | null): Promise<void> {
    setBusy(true);
    reportError(null);
    const response = await fetch(
      statusItemUrl(workspaceId, projectId, status.id),
      body === null
        ? { method }
        : {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          },
    );
    if (!response.ok) {
      reportError(await readError(response, t("statuses.updateError")));
      setBusy(false);
      return;
    }
    const responseBody: unknown = await response.json();
    if (!isWorkspaceStatus(responseBody)) {
      reportError(t("statuses.invalid"));
      setBusy(false);
      return;
    }
    onStatusChanged(method === "DELETE" ? null : responseBody);
    setBusy(false);
  }

  return (
    <Flex align="center" gap="2" wrap="wrap">
      {dragHandle}
      <input
        className="status-color-input"
        type="color"
        aria-label={t("statuses.color", { name: status.name })}
        value={color}
        onChange={(event) => setColor(event.target.value)}
      />
      <TextField.Root
        aria-label={t("statuses.name", { name: status.name })}
        disabled={required}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      {changed && (
        <IconButton disabled={busy || name.trim().length === 0} onClick={() => void save()}>
          <Save size={14} />
        </IconButton>
      )}
      <IconButton
        color="red"
        variant="soft"
        disabled={busy || required}
        aria-label={t("statuses.delete", { name: status.name })}
        onClick={() => void remove()}
      >
        <Trash2 size={14} />
      </IconButton>
    </Flex>
  );
}

function statusCollectionUrl(workspaceId: string, projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/statuses?workspaceId=${encodeURIComponent(workspaceId)}`;
}

function statusItemUrl(workspaceId: string, projectId: string, statusId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/statuses/${encodeURIComponent(statusId)}?workspaceId=${encodeURIComponent(workspaceId)}`;
}

function statusReorderUrl(workspaceId: string, projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/statuses/reorder?workspaceId=${encodeURIComponent(workspaceId)}`;
}

function isDoneStatusName(name: string): boolean {
  return ["done", "closed", "готово", "завершено"].includes(name.trim().toLocaleLowerCase("ru"));
}

function isRequiredStatusName(name: string): boolean {
  return ["backlog", "in progress"].includes(
    name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en"),
  );
}

async function readError(response: Response, fallback: string): Promise<string> {
  const value: unknown = await response.json();
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

function isWorkspaceStatus(value: unknown): value is WorkspaceStatus {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "workspaceId" in value &&
    typeof value.workspaceId === "string" &&
    "projectId" in value &&
    typeof value.projectId === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "color" in value &&
    typeof value.color === "string" &&
    "position" in value &&
    typeof value.position === "string" &&
    "isDone" in value &&
    typeof value.isDone === "boolean" &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    "updatedAt" in value &&
    typeof value.updatedAt === "string"
  );
}

function isWorkspaceStatusList(value: unknown): value is WorkspaceStatus[] {
  return Array.isArray(value) && value.every(isWorkspaceStatus);
}
