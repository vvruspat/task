import type { TaskApiClient, TaskDetail } from "@task/api-client";
import {
  Alert,
  Board,
  BoardCard,
  BoardColumn,
  Button,
  Card,
  ContentGrid,
  DescriptionList,
  Flex,
  Heading,
  Select,
  Stack,
  StatusDot,
  Text,
} from "@task/ui/app";
import type { KeyboardEvent, ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  buildKanbanColumns,
  buildKanbanSummary,
  getAdjacentKanbanStatusId,
} from "../workspaceViewModels.js";
import type { ProjectSummary, TaskSummary, WorkspaceStatus } from "./types.js";

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
    <ContentGrid>
      <Card aria-labelledby="kanban-view-title">
        <Stack gap="lg">
          <Flex align="end" justify="between">
            <Stack gap="xs">
              <Text tone="muted">Kanban</Text>
              <Heading id="kanban-view-title" level={2}>
                Status board
              </Heading>
            </Stack>
            <Select
              aria-label="Filter board by project"
              options={[
                { label: "All projects", value: ALL_PROJECTS_KEY },
                ...projects.map((project) => ({ label: project.title, value: project.id })),
              ]}
              value={projectFilter}
              onValueChange={setProjectFilter}
            />
          </Flex>
          <Text id="kanban-keyboard-help" tone="muted">
            Select a project to focus the board. On a task card, use the left and right arrow keys
            to move it between statuses.
          </Text>
          {actionError === null ? null : (
            <Alert tone="danger">
              <Text>
                {actionError.message} The task was returned to its previous status. Change its
                status again to retry.
              </Text>
            </Alert>
          )}
          <Board>
            {columns.map((column) => (
              <BoardColumn
                actions={<Text>{column.taskCount}</Text>}
                aria-labelledby={`${column.id}-title`}
                header={
                  <Flex align="center" gap="sm">
                    <StatusDot tone={statusToneFromColor(column.color)} />
                    <Heading id={`${column.id}-title`} level={4}>
                      {column.name}
                    </Heading>
                  </Flex>
                }
                key={column.id}
              >
                <Stack gap="sm">
                  {column.tasks.map((card) => {
                    const task = visibleTasks.find((candidate) => candidate.id === card.id);
                    if (task === undefined) return null;
                    const isUpdating = updatingTaskIds.has(task.id);
                    return (
                      <BoardCard aria-busy={isUpdating} key={task.id}>
                        <Button
                          aria-describedby="kanban-keyboard-help"
                          onClick={() => onOpenTask(task.id)}
                          onKeyDown={(event) => {
                            handleCardKeyDown(event, task);
                            if (event.defaultPrevented) return;
                          }}
                          variant="ghost"
                        >
                          {card.title}
                        </Button>
                        <Text tone="muted">{card.projectTitle}</Text>
                        <Flex gap="xs">
                          <Text>{card.assigneeLabel}</Text>
                          <Text>{card.dueDateLabel}</Text>
                          <time dateTime={card.updatedAtLabel}>{card.updatedAtLabel}</time>
                        </Flex>
                        <Flex
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <Select
                            aria-label={`Status for ${task.title}`}
                            disabled={isUpdating || client === null || workspaceId === null}
                            options={[
                              { label: "Unset", value: "unset-status" },
                              ...statuses.map((status) => ({
                                label: status.name,
                                value: status.id,
                              })),
                            ]}
                            value={task.statusId ?? "unset-status"}
                            onValueChange={(value) =>
                              updateTaskStatus(task.id, value === "unset-status" ? null : value)
                            }
                          />
                        </Flex>
                      </BoardCard>
                    );
                  })}
                </Stack>
              </BoardColumn>
            ))}
          </Board>
        </Stack>
      </Card>

      <Card aria-labelledby="kanban-summary-title">
        <Stack gap="md">
          <Stack gap="xs">
            <Text tone="muted">Summary</Text>
            <Heading id="kanban-summary-title" level={3}>
              Board load
            </Heading>
          </Stack>
          <Text tone="muted">
            Status changes update immediately and are restored if the server rejects them.
          </Text>
          <DescriptionList
            items={[
              { label: "Columns", value: summary.columnCount },
              { label: "Tasks", value: summary.taskCount },
              { label: "Done", value: summary.doneTaskCount },
              { label: "Unset", value: summary.unsetTaskCount },
            ]}
          />
        </Stack>
      </Card>
    </ContentGrid>
  );
}

function statusToneFromColor(
  color: string,
): "accent" | "danger" | "neutral" | "success" | "warning" {
  const normalizedColor = color.toLowerCase();
  if (normalizedColor === "#22c55e" || normalizedColor === "#16a34a") return "success";
  if (normalizedColor === "#ef4444" || normalizedColor === "#dc2626") return "danger";
  if (normalizedColor === "#f59e0b" || normalizedColor === "#eab308") return "warning";
  return normalizedColor === "#d8d1c4" ? "neutral" : "accent";
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
