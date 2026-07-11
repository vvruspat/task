import type { TaskApiClient, TaskDetail } from "@task/api-client";
import { Button, Callout, Card, Flex, Grid, Heading, Select, Text } from "@task/ui/app";
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
type StatusActionError = { message: string; statusId: string | null; taskId: string };
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
    if (task === undefined) return;
    const previousTask = task;
    setActionError(null);
    setUpdatingTaskIds((current) => new Set(current).add(taskId));
    setVisibleTasks((current) => replaceTaskStatus(current, taskId, statusId));
    void client
      .updateTaskStatus({ body: { statusId }, projectId: task.projectId, taskId, workspaceId })
      .then((updatedTask) => {
        setVisibleTasks((current) => replaceTask(current, updatedTask));
        onTaskUpdated(updatedTask);
      })
      .catch((error: unknown) => {
        setVisibleTasks((current) => replaceTask(current, previousTask));
        setActionError({ message: readError(error), statusId, taskId });
      })
      .finally(() =>
        setUpdatingTaskIds((current) => {
          const next = new Set(current);
          next.delete(taskId);
          return next;
        }),
      );
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
    <Flex direction="column" gap="4">
      <Card>
        <Flex direction="column" gap="4">
          <Flex align="end" justify="between">
            <Flex direction="column" gap="1">
              <Text color="gray" size="2">
                Kanban
              </Text>
              <Heading size="6">Status board</Heading>
            </Flex>
            <Select.Root value={projectFilter} onValueChange={setProjectFilter}>
              <Select.Trigger aria-label="Filter board by project" />
              <Select.Content>
                <Select.Item value={ALL_PROJECTS_KEY}>All projects</Select.Item>
                {projects.map((project) => (
                  <Select.Item key={project.id} value={project.id}>
                    {project.title}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
          <Text color="gray" id="kanban-keyboard-help">
            Select a project to focus the board. On a task card, use the left and right arrow keys
            to move it between statuses.
          </Text>
          {actionError === null ? null : (
            <Callout.Root color="red">
              <Callout.Text>
                {actionError.message} The task was returned to its previous status. Change its
                status again to retry.
              </Callout.Text>
            </Callout.Root>
          )}
          <Grid columns={{ initial: "1", md: "3" }} gap="3">
            {columns.map((column) => (
              <Card key={column.id} variant="surface">
                <Flex direction="column" gap="3">
                  <Flex align="center" justify="between">
                    <Heading size="4">{column.name}</Heading>
                    <Text color="gray">{column.taskCount}</Text>
                  </Flex>
                  {column.tasks.map((card) => {
                    const task = visibleTasks.find((candidate) => candidate.id === card.id);
                    if (task === undefined) return null;
                    const isUpdating = updatingTaskIds.has(task.id);
                    return (
                      <Card aria-busy={isUpdating} key={task.id} variant="classic">
                        <Flex direction="column" gap="2">
                          <Button
                            aria-describedby="kanban-keyboard-help"
                            onClick={() => onOpenTask(task.id)}
                            onKeyDown={(event) => handleCardKeyDown(event, task)}
                            variant="ghost"
                          >
                            {card.title}
                          </Button>
                          <Text color="gray" size="2">
                            {card.projectTitle}
                          </Text>
                          <Text size="2">
                            {card.assigneeLabel} · {card.dueDateLabel}
                          </Text>
                          <Select.Root
                            disabled={isUpdating || client === null || workspaceId === null}
                            value={task.statusId ?? "unset-status"}
                            onValueChange={(value) =>
                              updateTaskStatus(task.id, value === "unset-status" ? null : value)
                            }
                          >
                            <Select.Trigger aria-label={`Status for ${task.title}`} />
                            <Select.Content>
                              <Select.Item value="unset-status">Unset</Select.Item>
                              {statuses.map((status) => (
                                <Select.Item key={status.id} value={status.id}>
                                  {status.name}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        </Flex>
                      </Card>
                    );
                  })}
                </Flex>
              </Card>
            ))}
          </Grid>
        </Flex>
      </Card>
      <Card>
        <Flex direction="column" gap="2">
          <Heading size="5">Board load</Heading>
          <Text color="gray">
            Status changes update immediately and are restored if the server rejects them.
          </Text>
          <Text>
            Columns: {summary.columnCount} · Tasks: {summary.taskCount} · Done:{" "}
            {summary.doneTaskCount} · Unset: {summary.unsetTaskCount}
          </Text>
        </Flex>
      </Card>
    </Flex>
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
