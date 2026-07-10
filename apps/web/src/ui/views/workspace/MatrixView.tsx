import type { ProjectMatrix, TaskApiClient, TaskDetail } from "@task/api-client";
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
    if (client === null || projectId === null || workspaceId === null || updatingTaskId !== null) {
      return;
    }
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
        if (isSameMatrixScope(activeScopeRef.current, requestScope)) {
          setActionError({ message: readError(error), scope: requestScope, statusId, taskId });
        }
      })
      .finally(() => {
        if (isSameMatrixScope(activeScopeRef.current, requestScope)) setUpdatingTaskId(null);
      });
  };

  if (projectId === null) {
    return <MatrixNotice message="Choose a project to open its task matrix." />;
  }
  if (workspaceId === null || client === null || loadState.status === "loading") {
    return <MatrixNotice message="Loading the project matrix…" />;
  }
  if (loadState.status === "error") {
    return <MatrixNotice message={loadState.message} mode="error" />;
  }
  if (model === null) {
    return <MatrixNotice message="Loading the project matrix…" />;
  }
  if (model.columns.length === 0) {
    return <MatrixNotice message="This project has no root tasks to arrange in a matrix." />;
  }

  return (
    <ContentGrid>
      <Card aria-labelledby="matrix-view-title">
        <Stack gap="lg">
          <Stack gap="xs">
            <Text tone="muted">Matrix</Text>
            <Heading id="matrix-view-title" level={2}>
              Project task matrix
            </Heading>
          </Stack>
          {visibleActionError === null ? null : (
            <Alert tone="danger">
              <Flex justify="between">
                <Text>{visibleActionError.message}</Text>
                <Button
                  disabled={updatingTaskId !== null}
                  onClick={() =>
                    updateTaskStatus(visibleActionError.taskId, visibleActionError.statusId)
                  }
                >
                  Retry status update
                </Button>
              </Flex>
            </Alert>
          )}
          <Board>
            {model.columns.map((column) => (
              <BoardColumn
                aria-labelledby={`${column.id}-title`}
                header={
                  <Stack gap="xs">
                    <Heading id={`${column.id}-title`} level={4}>
                      {column.title}
                    </Heading>
                    <Text tone="muted">Root task</Text>
                  </Stack>
                }
                key={column.id}
              >
                <Stack gap="sm">
                  {column.cells.map((cell) => (
                    <BoardCard key={cell.stage.id ?? "unassigned"}>
                      <Flex justify="between">
                        <Flex gap="xs">
                          {typeof cell.stage.color !== "string" ? null : (
                            <StatusDot tone={statusToneFromColor(cell.stage.color)} />
                          )}
                          <Text>{cell.stage.name}</Text>
                        </Flex>
                        <Text tone="muted">{cell.tasks.length}</Text>
                      </Flex>
                      {cell.tasks.length === 0 ? (
                        <Text tone="muted">No tasks</Text>
                      ) : (
                        cell.tasks.map((task) => (
                          <Stack gap="xs" key={task.id}>
                            <MatrixTaskButton
                              onOpenTask={onOpenTask}
                              taskId={task.id}
                              title={task.title}
                            />
                            <Flex
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <Select
                                aria-label={`Status for ${task.title}`}
                                disabled={updatingTaskId !== null}
                                options={model.stages.map((stage) => ({
                                  label: stage.name,
                                  value: stage.id ?? "unassigned",
                                }))}
                                value={task.statusId ?? "unassigned"}
                                onValueChange={(value) =>
                                  updateTaskStatus(task.id, value === "unassigned" ? null : value)
                                }
                              />
                            </Flex>
                          </Stack>
                        ))
                      )}
                    </BoardCard>
                  ))}
                </Stack>
              </BoardColumn>
            ))}
          </Board>
        </Stack>
      </Card>

      <Card aria-labelledby="matrix-summary-title">
        <Stack gap="md">
          <Stack gap="xs">
            <Text tone="muted">Summary</Text>
            <Heading id="matrix-summary-title" level={3}>
              Task tree
            </Heading>
          </Stack>
          <Text tone="muted">Every root task has one cell for every project stage.</Text>
          <DescriptionList
            items={[
              { label: "Root tasks", value: model.columns.length },
              { label: "Stages", value: model.stages.length },
              { label: "Subtasks", value: model.taskCount },
              { label: "Unassigned", value: model.unassignedTaskCount },
            ]}
          />
        </Stack>
      </Card>
    </ContentGrid>
  );
}

function MatrixTaskButton({
  onOpenTask,
  taskId,
  title,
}: {
  onOpenTask(taskId: string): void;
  taskId: string;
  title: string;
}): ReactElement {
  return (
    <Button onClick={() => onOpenTask(taskId)} variant="ghost">
      {title}
    </Button>
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
    <Card aria-labelledby="matrix-view-title">
      <Stack gap="md">
        <Stack gap="xs">
          <Text tone="muted">Matrix</Text>
          <Heading id="matrix-view-title" level={2}>
            Project task matrix
          </Heading>
        </Stack>
        <Alert tone={mode === "error" ? "danger" : "info"}>
          <Text>{message}</Text>
        </Alert>
      </Stack>
    </Card>
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
    if (cell.columnTaskId === sourceCell.columnTaskId && cell.stageId === task.statusId) {
      return { ...cell, tasks: [...withoutTask, task] };
    }
    return withoutTask.length === cell.tasks.length ? cell : { ...cell, tasks: withoutTask };
  });
}
