import type { TaskSummary } from "../tasks/tasks.contracts.js";

export type ProjectMatrixStage = {
  id: string | null;
  name: string;
  color: string | null;
  position: string;
  isDone: boolean;
};

export type ProjectMatrixColumn = TaskSummary;

export type ProjectMatrixCell = {
  columnTaskId: string;
  stageId: string | null;
  tasks: TaskSummary[];
};

export type ProjectMatrix = {
  columns: ProjectMatrixColumn[];
  stages: ProjectMatrixStage[];
  cells: ProjectMatrixCell[];
};
