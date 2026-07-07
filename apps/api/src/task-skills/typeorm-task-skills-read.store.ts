import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import { TaskSkillEntity, WorkspaceMemberEntity } from "../persistence/entities/index.js";
import type { TaskSkillSummary } from "./task-skills.contracts.js";
import type { TaskSkillsReadStore } from "./task-skills.store.js";

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
