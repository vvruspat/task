import type { ProjectMatrix, TaskApiClient, TaskDetail } from "@task/api-client";
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
import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildProjectMatrixModel,
  isSameMatrixScope,
  type MatrixScope,
} from "./matrixViewModels.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

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
    <MOperationalContentGrid>
      <WorkspacePanel eyebrow="Matrix" title="Project task matrix" titleId="matrix-view-title">
        {visibleActionError === null ? null : (
          <MAlert mode="error">
            <MFlex justify="space-between">
              <MText as="p">{visibleActionError.message}</MText>
              <MButton
                disabled={updatingTaskId !== null}
                onClick={() =>
                  updateTaskStatus(visibleActionError.taskId, visibleActionError.statusId)
                }
              >
                Retry status update
              </MButton>
            </MFlex>
          </MAlert>
        )}
        <MOperationalLane>
          {model.columns.map((column) => (
            <MOperationalBoardColumn key={column.id} aria-labelledby={`${column.id}-title`}>
              <MFlex align="start" direction="column" gap="xs">
                <MHeading id={`${column.id}-title`} mode="h4">
                  {column.title}
                </MHeading>
                <MText as="span" mode="secondary">
                  Root task
                </MText>
              </MFlex>
              <MFlex align="stretch" direction="column" gap="s">
                {column.cells.map((cell) => (
                  <MOperationalBoardCard key={cell.stage.id ?? "unassigned"}>
                    <MFlex justify="space-between" wrap="nowrap">
                      <MFlex gap="xs">
                        {typeof cell.stage.color !== "string" ? null : (
                          <MOperationalStatusDot color={cell.stage.color} aria-hidden="true" />
                        )}
                        <MText as="span">{cell.stage.name}</MText>
                      </MFlex>
                      <MText as="span" mode="secondary">
                        {cell.tasks.length}
                      </MText>
                    </MFlex>
                    {cell.tasks.length === 0 ? (
                      <MText as="p" mode="secondary">
                        No tasks
                      </MText>
                    ) : (
                      cell.tasks.map((task) => (
                        <MFlex align="stretch" direction="column" gap="xs" key={task.id}>
                          <MButtonCard
                            onOpenTask={onOpenTask}
                            taskId={task.id}
                            title={task.title}
                          />
                          <MFlex
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <MSelect
                              aria-label={`Status for ${task.title}`}
                              disabled={updatingTaskId !== null}
                              options={model.stages.map((stage) => ({
                                key: stage.id ?? "unassigned",
                                value: stage.name,
                              }))}
                              value={task.statusId ?? "unassigned"}
                              onValueChange={(value) =>
                                updateTaskStatus(task.id, value === "unassigned" ? null : value)
                              }
                            />
                          </MFlex>
                        </MFlex>
                      ))
                    )}
                  </MOperationalBoardCard>
                ))}
              </MFlex>
            </MOperationalBoardColumn>
          ))}
        </MOperationalLane>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Task tree" titleId="matrix-summary-title">
        <MText as="p" mode="secondary">
          Every root task has one cell for every project stage.
        </MText>
        <WorkspaceMetrics
          items={[
            { label: "Root tasks", value: model.columns.length },
            { label: "Stages", value: model.stages.length },
            { label: "Subtasks", value: model.taskCount },
            { label: "Unassigned", value: model.unassignedTaskCount },
          ]}
        />
      </WorkspacePanel>
    </MOperationalContentGrid>
  );
}

function MButtonCard({
  onOpenTask,
  taskId,
  title,
}: {
  onOpenTask(taskId: string): void;
  taskId: string;
  title: string;
}): ReactElement {
  return <MButton onClick={() => onOpenTask(taskId)}>{title}</MButton>;
}

function MatrixNotice({
  message,
  mode = "info",
}: {
  message: string;
  mode?: "error" | "info";
}): ReactElement {
  return (
    <WorkspacePanel eyebrow="Matrix" title="Project task matrix" titleId="matrix-view-title">
      <MAlert mode={mode}>
        <MText as="p">{message}</MText>
      </MAlert>
    </WorkspacePanel>
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
    if (cell.columnTaskId === sourceCell.columnTaskId && cell.stageId === task.statusId) {
      return { ...cell, tasks: [...withoutTask, task] };
    }
    return withoutTask.length === cell.tasks.length ? cell : { ...cell, tasks: withoutTask };
  });
}
