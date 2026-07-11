import type { ProjectMatrix, TaskApiClient, TaskDetail } from "@task/api-client";
import { Button, Callout, Card, Flex, Grid, Heading, Select, Text } from "@task/ui/app";
import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildProjectMatrixModel,
  isSameMatrixScope,
  type MatrixScope,
} from "./matrixViewModels.js";
export type MatrixViewProps = {
  client: TaskApiClient | null;
  onOpenTask(taskId: string): void;
  onTaskUpdated(task: TaskDetail): void;
  projectId: string | null;
  workspaceId: string | null;
};
type MatrixLoadState =
  | { status: "loading" }
  | { matrix: ProjectMatrix; status: "loaded" }
  | { message: string; status: "error" };
type MatrixActionError = {
  message: string;
  scope: MatrixScope;
  statusId: string | null;
  taskId: string;
};
export function MatrixView({
  client,
  onOpenTask,
  onTaskUpdated,
  projectId,
  workspaceId,
}: MatrixViewProps): ReactElement {
  const [loadState, setLoadState] = useState<MatrixLoadState>({ status: "loading" });
  const [actionError, setActionError] = useState<MatrixActionError | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const activeScopeRef = useRef({ projectId, workspaceId });
  activeScopeRef.current = { projectId, workspaceId };
  useEffect(() => {
    if (client === null || projectId === null || workspaceId === null) {
      setLoadState({ status: "loading" });
      return;
    }
    let isCurrent = true;
    setLoadState({ status: "loading" });
    void client
      .getProjectMatrix({ projectId, workspaceId })
      .then((matrix) => {
        if (isCurrent) setLoadState({ matrix, status: "loaded" });
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadState({ message: readError(error), status: "error" });
      });
    return () => {
      isCurrent = false;
    };
  }, [client, projectId, workspaceId]);
  useEffect(() => {
    activeScopeRef.current = { projectId, workspaceId };
    setActionError(null);
    setUpdatingTaskId(null);
  }, [projectId, workspaceId]);
  const model = useMemo(
    () => (loadState.status === "loaded" ? buildProjectMatrixModel(loadState.matrix) : null),
    [loadState],
  );
  const visibleActionError =
    actionError !== null && isSameMatrixScope(actionError.scope, activeScopeRef.current)
      ? actionError
      : null;
  const updateTaskStatus = (taskId: string, statusId: string | null): void => {
    if (client === null || projectId === null || workspaceId === null || updatingTaskId !== null)
      return;
    const requestScope = { projectId, workspaceId };
    setActionError(null);
    setUpdatingTaskId(taskId);
    void client
      .updateTaskStatus({ body: { statusId }, projectId, taskId, workspaceId })
      .then((task) => {
        if (!isSameMatrixScope(activeScopeRef.current, requestScope)) return;
        onTaskUpdated(task);
        setLoadState((currentState) =>
          currentState.status !== "loaded"
            ? currentState
            : {
                matrix: {
                  ...currentState.matrix,
                  cells: moveMatrixTask(currentState.matrix.cells, task),
                },
                status: "loaded",
              },
        );
      })
      .catch((error: unknown) => {
        if (isSameMatrixScope(activeScopeRef.current, requestScope))
          setActionError({ message: readError(error), scope: requestScope, statusId, taskId });
      })
      .finally(() => {
        if (isSameMatrixScope(activeScopeRef.current, requestScope)) setUpdatingTaskId(null);
      });
  };
  if (projectId === null)
    return <MatrixNotice message="Choose a project to open its task matrix." />;
  if (workspaceId === null || client === null || loadState.status === "loading")
    return <MatrixNotice message="Loading the project matrix…" />;
  if (loadState.status === "error")
    return <MatrixNotice message={loadState.message} mode="error" />;
  if (model === null || model.columns.length === 0)
    return (
      <MatrixNotice
        message={
          model === null
            ? "Loading the project matrix…"
            : "This project has no root tasks to arrange in a matrix."
        }
      />
    );
  return (
    <Flex direction="column" gap="4">
      <Card>
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="1">
            <Text color="gray" size="2">
              Matrix
            </Text>
            <Heading size="6">Project task matrix</Heading>
          </Flex>
          {visibleActionError === null ? null : (
            <Callout.Root color="red">
              <Callout.Text>{visibleActionError.message}</Callout.Text>
              <Button
                disabled={updatingTaskId !== null}
                onClick={() =>
                  updateTaskStatus(visibleActionError.taskId, visibleActionError.statusId)
                }
              >
                Retry status update
              </Button>
            </Callout.Root>
          )}
          <Grid columns={{ initial: "1", md: "2" }} gap="3">
            {model.columns.map((column) => (
              <Card key={column.id} variant="surface">
                <Flex direction="column" gap="3">
                  <Flex direction="column" gap="1">
                    <Heading size="4">{column.title}</Heading>
                    <Text color="gray" size="2">
                      Root task
                    </Text>
                  </Flex>
                  {column.cells.map((cell) => (
                    <Card key={cell.stage.id ?? "unassigned"} variant="classic">
                      <Flex direction="column" gap="2">
                        <Flex justify="between">
                          <Text weight="medium">{cell.stage.name}</Text>
                          <Text color="gray">{cell.tasks.length}</Text>
                        </Flex>
                        {cell.tasks.length === 0 ? (
                          <Text color="gray">No tasks</Text>
                        ) : (
                          cell.tasks.map((task) => (
                            <Flex direction="column" gap="2" key={task.id}>
                              <Button onClick={() => onOpenTask(task.id)} variant="ghost">
                                {task.title}
                              </Button>
                              <Select.Root
                                disabled={updatingTaskId !== null}
                                value={task.statusId ?? "unassigned"}
                                onValueChange={(value) =>
                                  updateTaskStatus(task.id, value === "unassigned" ? null : value)
                                }
                              >
                                <Select.Trigger aria-label={`Status for ${task.title}`} />
                                <Select.Content>
                                  {model.stages.map((stage) => (
                                    <Select.Item
                                      key={stage.id ?? "unassigned"}
                                      value={stage.id ?? "unassigned"}
                                    >
                                      {stage.name}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
                            </Flex>
                          ))
                        )}
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              </Card>
            ))}
          </Grid>
        </Flex>
      </Card>
      <Card>
        <Heading size="5">Task tree</Heading>
        <Text color="gray">Every root task has one cell for every project stage.</Text>
        <Text>
          Root tasks: {model.columns.length} · Stages: {model.stages.length} · Subtasks:{" "}
          {model.taskCount} · Unassigned: {model.unassignedTaskCount}
        </Text>
      </Card>
    </Flex>
  );
}
function MatrixNotice({
  message,
  mode = "info",
}: {
  message: string;
  mode?: "error" | "info";
}): ReactElement {
  return (
    <Card>
      <Flex direction="column" gap="2">
        <Text color="gray">Matrix</Text>
        <Heading size="6">Project task matrix</Heading>
        <Callout.Root color={mode === "error" ? "red" : "blue"}>
          <Callout.Text>{message}</Callout.Text>
        </Callout.Root>
      </Flex>
    </Card>
  );
}
function readError(error: unknown): string {
  return error instanceof Error ? error.message : "The project matrix could not be loaded.";
}
function moveMatrixTask(
  matrixCells: ProjectMatrix["cells"],
  task: TaskDetail,
): ProjectMatrix["cells"] {
  const sourceCell = matrixCells.find((cell) =>
    cell.tasks.some((candidate) => candidate.id === task.id),
  );
  if (sourceCell === undefined) return matrixCells;
  return matrixCells.map((cell) => {
    const withoutTask = cell.tasks.filter((candidate) => candidate.id !== task.id);
    if (cell.columnTaskId === sourceCell.columnTaskId && cell.stageId === task.statusId)
      return { ...cell, tasks: [...withoutTask, task] };
    return withoutTask.length === cell.tasks.length ? cell : { ...cell, tasks: withoutTask };
  });
}
