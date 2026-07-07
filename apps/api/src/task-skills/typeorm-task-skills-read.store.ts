import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  TaskSkillEntity,
  TaskSkillVersionEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import type {
  CreateTaskSkillInput,
  TaskSkillDetail,
  TaskSkillSummary,
  TaskSkillVersionSummary,
} from "./task-skills.contracts.js";
import type { TaskSkillCreateResult, TaskSkillsReadStore } from "./task-skills.store.js";

const taskSkillWriteRoles: ReadonlySet<WorkspaceMemberRole> = new Set(["owner", "admin", "member"]);

@Injectable()
export class TypeOrmTaskSkillsReadStore implements TaskSkillsReadStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listActiveForWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<TaskSkillSummary[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return null;
    }

    const skills = await dataSource.getRepository(TaskSkillEntity).find({
      where: { archivedAt: IsNull(), workspaceId },
      order: { name: "ASC", createdAt: "ASC" },
    });

    return skills.map((skill) => toTaskSkillSummary(skill));
  }

  async getActiveForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
  ): Promise<TaskSkillDetail | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return null;
    }

    const skill = await dataSource.getRepository(TaskSkillEntity).findOneBy({
      archivedAt: IsNull(),
      id: taskSkillId,
      workspaceId,
    });

    if (skill === null) {
      return null;
    }

    const versions = await dataSource.getRepository(TaskSkillVersionEntity).find({
      where: { taskSkillId, workspaceId },
      order: { version: "DESC", createdAt: "DESC" },
    });

    return {
      ...toTaskSkillSummary(skill),
      versions: versions.map((version) => toTaskSkillVersionSummary(version)),
    };
  }

  async createForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateTaskSkillInput,
  ): Promise<TaskSkillCreateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return { status: "workspace_not_found" };
    }

    if (!taskSkillWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const existingSkill = await dataSource.getRepository(TaskSkillEntity).findOneBy({
      name: input.name,
      workspaceId,
    });

    if (existingSkill !== null) {
      return { status: "duplicate_name" };
    }

    const created = await dataSource.transaction(async (manager): Promise<TaskSkillDetail> => {
      const skillRepository = manager.getRepository(TaskSkillEntity);
      const versionRepository = manager.getRepository(TaskSkillVersionEntity);
      const skill = skillRepository.create({
        workspaceId,
        name: input.name,
        description: input.description ?? null,
        aliases: input.aliases ?? [],
        createdByUserId: userId,
      });
      const savedSkill = await skillRepository.save(skill);
      const version = versionRepository.create({
        workspaceId,
        taskSkillId: savedSkill.id,
        version: 1,
        definition: input.definition,
        createdByUserId: userId,
      });
      const savedVersion = await versionRepository.save(version);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "task_skill.created",
        entityType: "task_skill",
        entityId: savedSkill.id,
        payload: {
          name: savedSkill.name,
          version: savedVersion.version,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return {
        ...toTaskSkillSummary(savedSkill),
        versions: [toTaskSkillVersionSummary(savedVersion)],
      };
    });

    return { status: "created", taskSkill: created };
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();

    if (dataSource === null) {
      throw new ServiceUnavailableException("Database is not configured.");
    }

    if (dataSource.isInitialized) {
      return dataSource;
    }

    this.initialization ??= dataSource.initialize();

    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

function toTaskSkillSummary(skill: TaskSkillEntity): TaskSkillSummary {
  return {
    id: skill.id,
    workspaceId: skill.workspaceId,
    name: skill.name,
    description: skill.description,
    aliases: skill.aliases,
    createdByUserId: skill.createdByUserId,
    archivedAt: skill.archivedAt,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
  };
}

function toTaskSkillVersionSummary(version: TaskSkillVersionEntity): TaskSkillVersionSummary {
  return {
    id: version.id,
    workspaceId: version.workspaceId,
    taskSkillId: version.taskSkillId,
    version: version.version,
    definition: version.definition,
    createdByUserId: version.createdByUserId,
    createdAt: version.createdAt,
  };
}
