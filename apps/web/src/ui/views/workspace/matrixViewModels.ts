import type { ProjectMatrix } from "@task/api-client";

export type MatrixScope = {
  projectId: string | null;
  workspaceId: string | null;
};

export function isSameMatrixScope(left: MatrixScope, right: MatrixScope): boolean {
  return left.projectId === right.projectId && left.workspaceId === right.workspaceId;
}

export type ProjectMatrixStage =
  | ProjectMatrix["stages"][number]
  | {
      color: null;
      id: null;
      isDone: false;
      name: "Unassigned";
      position: "";
    };

const unassignedStage: ProjectMatrixStage = {
  color: null,
  id: null,
  isDone: false,
  name: "Unassigned",
  position: "",
};

export function buildProjectMatrixModel(matrix: ProjectMatrix): {
  columns: {
    cells: { stage: ProjectMatrixStage; tasks: ProjectMatrix["cells"][number]["tasks"] }[];
    id: string;
    title: string;
  }[];
  stages: ProjectMatrixStage[];
  taskCount: number;
  unassignedTaskCount: number;
} {
  const stages: ProjectMatrixStage[] = [...matrix.stages].sort(compareStages);
  const allStages = stages.some((stage) => stage.id == null)
    ? stages
    : [unassignedStage, ...stages];
  const cellsByKey = new Map(
    matrix.cells.map((cell) => [
      `${cell.columnTaskId}:${cell.stageId ?? "unassigned"}`,
      cell.tasks,
    ]),
  );
  const columns = [...matrix.columns]
    .sort(
      (left, right) =>
        left.position.localeCompare(right.position) || left.id.localeCompare(right.id),
    )
    .map((column) => ({
      id: column.id,
      title: column.title,
      cells: allStages.map((stage) => ({
        stage,
        tasks: cellsByKey.get(`${column.id}:${stage.id ?? "unassigned"}`) ?? [],
      })),
    }));
  const tasks = matrix.cells.flatMap((cell) => cell.tasks);
  return {
    columns,
    stages: allStages,
    taskCount: tasks.length,
    unassignedTaskCount: tasks.filter((task) => task.statusId === null).length,
  };
}

function compareStages(
  left: ProjectMatrix["stages"][number],
  right: ProjectMatrix["stages"][number],
): number {
  return (
    left.position.localeCompare(right.position) ||
    left.name.localeCompare(right.name) ||
    (left.id ?? "").localeCompare(right.id ?? "")
  );
}
