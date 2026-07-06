import { DataSource, type DataSourceOptions } from "typeorm";
import type { ApiDatabaseConfig } from "./config.js";
import {
  AttachmentEntity,
  CommentEntity,
  ProjectEntity,
  StatusEntity,
  TaskEntity,
  TaskSkillEntity,
  TaskSkillVersionEntity,
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
} from "./persistence/entities/index.js";
import { CreateCorePersistenceTables1783296000000 } from "./persistence/migrations/1783296000000-create-core-persistence-tables.js";
import { CreateProjectsTable1783296060000 } from "./persistence/migrations/1783296060000-create-projects-table.js";
import { CreateTasksTable1783296120000 } from "./persistence/migrations/1783296120000-create-tasks-table.js";
import { CreateTaskSkillsTables1783296180000 } from "./persistence/migrations/1783296180000-create-task-skills-tables.js";
import { CreateCommentsTable1783296240000 } from "./persistence/migrations/1783296240000-create-comments-table.js";
import { CreateAttachmentsTable1783296300000 } from "./persistence/migrations/1783296300000-create-attachments-table.js";

const apiEntities = [
  WorkspaceEntity,
  UserEntity,
  WorkspaceMemberEntity,
  ProjectEntity,
  StatusEntity,
  TaskEntity,
  TaskSkillEntity,
  TaskSkillVersionEntity,
  CommentEntity,
  AttachmentEntity,
] as const;
const apiMigrations = [
  CreateCorePersistenceTables1783296000000,
  CreateProjectsTable1783296060000,
  CreateTasksTable1783296120000,
  CreateTaskSkillsTables1783296180000,
  CreateCommentsTable1783296240000,
  CreateAttachmentsTable1783296300000,
] as const;

export function createTypeOrmDataSourceOptions(database: ApiDatabaseConfig): DataSourceOptions {
  return {
    type: "postgres",
    url: database.url,
    synchronize: false,
    migrationsRun: false,
    entities: [...apiEntities],
    migrations: [...apiMigrations],
  };
}

export function createApiDataSource(database: ApiDatabaseConfig): DataSource {
  return new DataSource(createTypeOrmDataSourceOptions(database));
}
