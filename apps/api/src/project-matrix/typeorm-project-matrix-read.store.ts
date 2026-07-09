import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, IsNull } from "typeorm";
import type { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ProjectEntity,
  StatusEntity,
  TaskEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { TaskSummary } from "../tasks/tasks.contracts.js";
import type { ProjectMatrix, ProjectMatrixStage } from "./project-matrix.contracts.js";
import type { ProjectMatrixReadStore } from "./project-matrix.store.js";

const unassignedStage: ProjectMatrixStage = {
  id: null,
  name: "Unassigned",
  color: null,
  position: "-1",
  isDone: false,
};

export const projectMatrixTaskOrder = {
  parentTaskId: "ASC",
  position: "ASC",
  createdAt: "ASC",
  id: "ASC",
} as const;

@Injectable()
export class TypeOrmProjectMatrixReadStore implements ProjectMatrixReadStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async getForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectMatrix | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return null;
    }

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      archivedAt: IsNull(),
      id: projectId,
      workspaceId,
    });

    if (project === null) {
      return null;
    }

    const [tasks, statuses] = await Promise.all([
      dataSource.getRepository(TaskEntity).find({
        where: { archivedAt: IsNull(), projectId, workspaceId },
        order: projectMatrixTaskOrder,
      }),
      dataSource.getRepository(StatusEntity).find({
        where: { workspaceId },
        order: { position: "ASC", name: "ASC" },
      }),
    ]);

    return buildProjectMatrix(tasks.map(toTaskSummary), [
      unassignedStage,
      ...statuses.map((status) => ({
        id: status.id,
        name: status.name,
        color: status.color,
        position: status.position,
        isDone: status.isDone,
      })),
    ]);
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) throw new ServiceUnavailableException("Database is not configured.");
    if (dataSource.isInitialized) return dataSource;
    this.initialization ??= dataSource.initialize();
    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

export function buildProjectMatrix(
  tasks: TaskSummary[],
  stages: ProjectMatrixStage[],
): ProjectMatrix {
  const columns = tasks.filter((task) => task.parentTaskId === null);
  const tasksByCell = new Map<string, TaskSummary[]>();
  const columnIds = new Set(columns.map((column) => column.id));

  for (const task of tasks) {
    if (task.parentTaskId === null || !columnIds.has(task.parentTaskId)) continue;
    const key = toCellKey(task.parentTaskId, task.statusId);
    const cellTasks = tasksByCell.get(key) ?? [];
    cellTasks.push(task);
    tasksByCell.set(key, cellTasks);
  }

  return {
    columns,
    stages,
    cells: columns.flatMap((column) =>
      stages.map((stage) => ({
        columnTaskId: column.id,
        stageId: stage.id,
        tasks: tasksByCell.get(toCellKey(column.id, stage.id)) ?? [],
      })),
    ),
  };
}

function toCellKey(columnTaskId: string, stageId: string | null): string {
  return `${columnTaskId}:${stageId ?? "unassigned"}`;
}

function toTaskSummary(task: TaskEntity): TaskSummary {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    parentTaskId: task.parentTaskId,
    title: task.title,
    description: task.description,
    statusId: task.statusId,
    assigneeUserId: task.assigneeUserId,
    createdByUserId: task.createdByUserId,
    position: task.position,
    dueAt: task.dueAt,
    sourceSkillId: task.sourceSkillId,
    sourceSkillVersionId: task.sourceSkillVersionId,
    metadata: task.metadata,
    archivedAt: task.archivedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
