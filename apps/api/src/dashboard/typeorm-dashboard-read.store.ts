import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, IsNull, type SelectQueryBuilder } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  AgentRunEntity,
  ConfirmationRequestEntity,
  ProjectEntity,
  StatusEntity,
  TaskEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type {
  DashboardActivity,
  DashboardAgentRun,
  DashboardConfirmation,
  DashboardOverview,
  DashboardProject,
  DashboardTaskCounts,
  ListMyTasksInput,
  MyTaskItem,
  MyTasksPage,
} from "./dashboard.contracts.js";
import type { DashboardReadStore } from "./dashboard.store.js";

const dueSoonDays = 7;
export const activeTaskCountConditions = [
  "task.archived_at IS NULL",
  "project.archived_at IS NULL",
  "(status.is_done IS NULL OR status.is_done=false)",
] as const;
@Injectable()
export class TypeOrmDashboardReadStore implements DashboardReadStore {
  private initialization: Promise<DataSource> | null = null;
  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async getOverview(
    workspaceId: string,
    userId: string,
    now: Date,
  ): Promise<DashboardOverview | null> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.isWorkspaceMember(dataSource, workspaceId, userId))) return null;
    const [projects, taskCounts, activity, confirmations, agentRuns] = await Promise.all([
      dataSource.getRepository(ProjectEntity).find({
        where: { workspaceId, archivedAt: IsNull() },
        order: { updatedAt: "DESC" },
        take: 12,
      }),
      this.getTaskCounts(dataSource, workspaceId, userId, now),
      dataSource
        .getRepository(ActivityEventEntity)
        .find({ where: { workspaceId }, order: { createdAt: "DESC" }, take: 12 }),
      dataSource.getRepository(ConfirmationRequestEntity).find({
        where: { workspaceId, userId, status: "pending" },
        order: { createdAt: "DESC" },
        take: 12,
      }),
      dataSource
        .getRepository(AgentRunEntity)
        .find({ where: { workspaceId, userId }, order: { createdAt: "DESC" }, take: 12 }),
    ]);
    return {
      activeProjects: projects.map(toDashboardProject),
      taskCounts,
      recentActivity: activity.map(toDashboardActivity),
      pendingConfirmations: confirmations.map(toDashboardConfirmation),
      recentAgentRuns: agentRuns.map(toDashboardAgentRun),
    };
  }

  async listMyTasks(
    workspaceId: string,
    userId: string,
    input: ListMyTasksInput,
    now: Date,
  ): Promise<MyTasksPage | null> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.isWorkspaceMember(dataSource, workspaceId, userId))) return null;
    const query = dataSource
      .getRepository(TaskEntity)
      .createQueryBuilder("task")
      .innerJoin(
        ProjectEntity,
        "project",
        "project.id = task.project_id AND project.workspace_id = task.workspace_id",
      )
      .leftJoin(
        StatusEntity,
        "status",
        "status.id = task.status_id AND status.workspace_id = task.workspace_id",
      )
      .where("task.workspace_id = :workspaceId", { workspaceId })
      .andWhere("task.assignee_user_id = :userId", { userId })
      .andWhere("task.archived_at IS NULL")
      .andWhere("project.archived_at IS NULL")
      .andWhere("(status.is_done IS NULL OR status.is_done = false)");
    if (input.projectId !== undefined)
      query.andWhere("task.project_id = :projectId", { projectId: input.projectId });
    if (input.statusId !== undefined)
      query.andWhere("task.status_id = :statusId", { statusId: input.statusId });
    this.applyQueue(query, input, now);
    const total = await query.getCount();
    const rows = await query
      .select([
        "task.id AS task_id",
        "task.project_id AS project_id",
        "task.title AS task_title",
        "task.due_at AS task_due_at",
        "task.status_id AS task_status_id",
        "task.position AS task_position",
        "task.updated_at AS task_updated_at",
        "project.title AS project_title",
        "status.name AS status_name",
        "status.color AS status_color",
      ])
      .orderBy("task.due_at", "ASC", "NULLS LAST")
      .addOrderBy("task.position", "ASC")
      .addOrderBy("task.updated_at", "DESC")
      .offset((input.page - 1) * input.pageSize)
      .limit(input.pageSize)
      .getRawMany<RawMyTask>();
    return { items: rows.map(toMyTaskItem), page: input.page, pageSize: input.pageSize, total };
  }

  private applyQueue(
    query: SelectQueryBuilder<TaskEntity>,
    input: ListMyTasksInput,
    now: Date,
  ): void {
    if (input.queue === undefined) return;
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);
    if (input.queue === "today")
      query.andWhere("task.due_at >= :today AND task.due_at < :tomorrow", {
        today: startOfToday,
        tomorrow: startOfTomorrow,
      });
    if (input.queue === "upcoming")
      query.andWhere("task.due_at >= :tomorrow", { tomorrow: startOfTomorrow });
    if (input.queue === "overdue") query.andWhere("task.due_at < :today", { today: startOfToday });
    if (input.queue === "review")
      query.andWhere("LOWER(status.name) = :reviewStatus", { reviewStatus: "review" });
  }

  private async getTaskCounts(
    dataSource: DataSource,
    workspaceId: string,
    userId: string,
    now: Date,
  ): Promise<DashboardTaskCounts> {
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const dueSoonEnd = new Date(startOfToday);
    dueSoonEnd.setUTCDate(dueSoonEnd.getUTCDate() + dueSoonDays + 1);
    const base = () =>
      dataSource
        .getRepository(TaskEntity)
        .createQueryBuilder("task")
        .innerJoin(
          ProjectEntity,
          "project",
          "project.id = task.project_id AND project.workspace_id = task.workspace_id",
        )
        .leftJoin(
          StatusEntity,
          "status",
          "status.id=task.status_id AND status.workspace_id=task.workspace_id",
        )
        .where("task.workspace_id=:workspaceId", { workspaceId })
        .andWhere("task.assignee_user_id=:userId", { userId })
        .andWhere(activeTaskCountConditions[0])
        .andWhere(activeTaskCountConditions[1])
        .andWhere(activeTaskCountConditions[2]);
    const [assigned, overdue, dueSoon] = await Promise.all([
      base().getCount(),
      base().andWhere("task.due_at < :today", { today: startOfToday }).getCount(),
      base()
        .andWhere("task.due_at >= :today AND task.due_at < :dueSoonEnd", {
          today: startOfToday,
          dueSoonEnd,
        })
        .getCount(),
    ]);
    return { assigned, overdue, dueSoon };
  }
  private async isWorkspaceMember(
    dataSource: DataSource,
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    return (
      (await dataSource.getRepository(WorkspaceMemberEntity).countBy({ workspaceId, userId })) > 0
    );
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
type RawMyTask = {
  task_id: string;
  project_id: string;
  project_title: string;
  task_title: string;
  task_due_at: Date | null;
  task_status_id: string | null;
  status_name: string | null;
  status_color: string | null;
  task_position: string;
  task_updated_at: Date;
};
function toDashboardProject(value: ProjectEntity): DashboardProject {
  return { id: value.id, title: value.title, status: value.status, updatedAt: value.updatedAt };
}
function toDashboardActivity(value: ActivityEventEntity): DashboardActivity {
  return {
    id: value.id,
    eventType: value.eventType,
    entityType: value.entityType,
    entityId: value.entityId,
    actorUserId: value.actorUserId,
    createdAt: value.createdAt,
  };
}
function toDashboardConfirmation(value: ConfirmationRequestEntity): DashboardConfirmation {
  return {
    id: value.id,
    agentRunId: value.agentRunId,
    kind: value.kind,
    expiresAt: value.expiresAt,
    createdAt: value.createdAt,
  };
}
function toDashboardAgentRun(value: AgentRunEntity): DashboardAgentRun {
  return {
    id: value.id,
    source: value.source,
    status: value.status,
    inputText: value.inputText,
    createdAt: value.createdAt,
  };
}
function toMyTaskItem(value: RawMyTask): MyTaskItem {
  return {
    id: value.task_id,
    projectId: value.project_id,
    projectTitle: value.project_title,
    title: value.task_title,
    dueAt: value.task_due_at,
    statusId: value.task_status_id,
    statusName: value.status_name,
    statusColor: value.status_color,
    position: value.task_position,
    updatedAt: value.task_updated_at,
  };
}
