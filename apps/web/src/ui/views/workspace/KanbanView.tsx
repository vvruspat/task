import type { TaskApiClient, TaskDetail } from "@task/api-client";
import {
  MAlert,
  MButton,
  MFlex,
  MHeading,
  MOperationalBoardCard,
  MOperationalBoardColumn,
  MOperationalContentGrid,
  MOperationalLane,
  MOperationalStatusDot,
  MSelect,
  MText,
} from "@task/ui/app";
import type { KeyboardEvent, ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  buildKanbanColumns,
  buildKanbanSummary,
  getAdjacentKanbanStatusId,
} from "../workspaceViewModels.js";
import type { ProjectSummary, TaskSummary, WorkspaceStatus } from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

export type KanbanViewProps = {
  client: TaskApiClient | null;
  onOpenTask(taskId: string): void;
  onTaskUpdated(task: TaskDetail): void;
  projects: ProjectSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaceId: string | null;
};

type StatusActionError = {
  message: string;
  statusId: string | null;
  taskId: string;
};

const ALL_PROJECTS_KEY = "all-projects";

export function KanbanView({
  client,
  onOpenTask,
  onTaskUpdated,
  projects,
  statuses,
  tasks,
  workspaceId,
}: KanbanViewProps): ReactElement {
  const [projectFilter, setProjectFilter] = useState(ALL_PROJECTS_KEY);
  const [visibleTasks, setVisibleTasks] = useState(tasks);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<ReadonlySet<string>>(new Set());
  const [actionError, setActionError] = useState<StatusActionError | null>(null);

  useEffect(() => {
    setVisibleTasks(tasks);
  }, [tasks]);

  const filteredTasks = useMemo(
    () =>
      projectFilter === ALL_PROJECTS_KEY
        ? visibleTasks
        : visibleTasks.filter((task) => task.projectId === projectFilter),
    [projectFilter, visibleTasks],
  );
  const columns = buildKanbanColumns(projects, statuses, filteredTasks);
  const summary = buildKanbanSummary(statuses, filteredTasks);

  const updateTaskStatus = (taskId: string, statusId: string | null): void => {
    if (client === null || workspaceId === null || updatingTaskIds.has(taskId)) return;

    const task = visibleTasks.find((candidate) => candidate.id === taskId);
    if (task === undefined || task.statusId === statusId) return;

    const previousTask = task;
    setActionError(null);
    setUpdatingTaskIds((current) => new Set(current).add(taskId));
    setVisibleTasks((current) => replaceTaskStatus(current, taskId, statusId));

    void client
      .updateTaskStatus({
        body: { statusId },
        projectId: task.projectId,
        taskId,
        workspaceId,
      })
      .then((updatedTask) => {
        setVisibleTasks((current) => replaceTask(current, updatedTask));
        onTaskUpdated(updatedTask);
      })
      .catch((error: unknown) => {
        setVisibleTasks((current) => replaceTask(current, previousTask));
        setActionError({ message: readError(error), statusId, taskId });
      })
      .finally(() => {
        setUpdatingTaskIds((current) => {
          const next = new Set(current);
          next.delete(taskId);
          return next;
        });
      });
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, task: TaskSummary): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const nextStatusId = getAdjacentKanbanStatusId(
      statuses,
      task.statusId ?? null,
      event.key === "ArrowRight" ? "next" : "previous",
    );
    if (nextStatusId === task.statusId) return;
    event.preventDefault();
    updateTaskStatus(task.id, nextStatusId);
  };

  return (
    <MOperationalContentGrid>
      <WorkspacePanel eyebrow="Kanban" title="Status board" titleId="kanban-view-title">
        <MFlex align="end" justify="space-between" wrap="wrap">
          <MText as="p" id="kanban-keyboard-help" mode="secondary">
            Select a project to focus the board. On a task card, use the left and right arrow keys
            to move it between statuses.
          </MText>
          <MSelect
            aria-label="Filter board by project"
            options={[
              { key: ALL_PROJECTS_KEY, value: "All projects" },
              ...projects.map((project) => ({ key: project.id, value: project.title })),
            ]}
            value={projectFilter}
            onValueChange={setProjectFilter}
          />
        </MFlex>
        {actionError === null ? null : (
          <MAlert mode="error">
            <MText as="p">
              {actionError.message} The task was returned to its previous status. Change its status
              again to retry.
            </MText>
          </MAlert>
        )}
        <MOperationalLane>
          {columns.map((column) => (
            <MOperationalBoardColumn key={column.id} aria-labelledby={`${column.id}-title`}>
              <MFlex justify="space-between" wrap="nowrap">
                <MOperationalStatusDot color={column.color} aria-hidden="true" />
                <MHeading id={`${column.id}-title`} mode="h4">
                  {column.name}
                </MHeading>
                <strong>{column.taskCount}</strong>
              </MFlex>
              <MFlex align="stretch" direction="column" gap="s">
                {column.tasks.map((card) => {
                  const task = visibleTasks.find((candidate) => candidate.id === card.id);
                  if (task === undefined) return null;
                  const isUpdating = updatingTaskIds.has(task.id);
                  return (
                    <MOperationalBoardCard aria-busy={isUpdating} key={task.id}>
                      <MButton
                        aria-describedby="kanban-keyboard-help"
                        justify="start"
                        mode="transparent"
                        onClick={() => onOpenTask(task.id)}
                        onKeyDown={(event) => {
                          handleCardKeyDown(event, task);
                          if (event.defaultPrevented) return;
                        }}
                      >
                        {card.title}
                      </MButton>
                      <MText as="p" mode="secondary">
                        {card.projectTitle}
                      </MText>
                      <MFlex gap="xs">
                        <MText as="span">{card.assigneeLabel}</MText>
                        <MText as="span">{card.dueDateLabel}</MText>
                        <time dateTime={card.updatedAtLabel}>{card.updatedAtLabel}</time>
                      </MFlex>
                      <MFlex
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <MSelect
                          aria-label={`Status for ${task.title}`}
                          disabled={isUpdating || client === null || workspaceId === null}
                          options={[
                            { key: "unset-status", value: "Unset" },
                            ...statuses.map((status) => ({ key: status.id, value: status.name })),
                          ]}
                          value={task.statusId ?? "unset-status"}
                          onValueChange={(value) =>
                            updateTaskStatus(task.id, value === "unset-status" ? null : value)
                          }
                        />
                      </MFlex>
                    </MOperationalBoardCard>
                  );
                })}
              </MFlex>
            </MOperationalBoardColumn>
          ))}
        </MOperationalLane>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Board load" titleId="kanban-summary-title">
        <MText as="p" mode="secondary">
          Status changes update immediately and are restored if the server rejects them.
        </MText>
        <WorkspaceMetrics
          items={[
            { label: "Columns", value: summary.columnCount },
            { label: "Tasks", value: summary.taskCount },
            { label: "Done", value: summary.doneTaskCount },
            { label: "Unset", value: summary.unsetTaskCount },
          ]}
        />
      </WorkspacePanel>
    </MOperationalContentGrid>
  );
}

function replaceTask(tasks: TaskSummary[], updatedTask: TaskDetail): TaskSummary[] {
  return tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
}

function replaceTaskStatus(
  tasks: TaskSummary[],
  taskId: string,
  statusId: string | null,
): TaskSummary[] {
  return tasks.map((task) => (task.id === taskId ? { ...task, statusId } : task));
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : "The task status could not be updated.";
}
