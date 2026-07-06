import { DataSource, type DataSourceOptions } from "typeorm";
import type { ApiDatabaseConfig } from "./config.js";
import {
  ActivityEventEntity,
  AgentRunEntity,
  AgentToolCallEntity,
  AttachmentEntity,
  CommentEntity,
  ConfirmationRequestEntity,
  ProjectEntity,
  StatusEntity,
  TaskEntity,
  TaskSkillEntity,
  TaskSkillVersionEntity,
  TelegramChatEntity,
  TelegramIdentityEntity,
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
import { CreateActivityEventsTable1783296360000 } from "./persistence/migrations/1783296360000-create-activity-events-table.js";
import { CreateAgentRunTables1783296420000 } from "./persistence/migrations/1783296420000-create-agent-run-tables.js";
import { CreateConfirmationRequestsTable1783296480000 } from "./persistence/migrations/1783296480000-create-confirmation-requests-table.js";
import { CreateTelegramTables1783296540000 } from "./persistence/migrations/1783296540000-create-telegram-tables.js";

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
  ActivityEventEntity,
  AgentRunEntity,
  AgentToolCallEntity,
  ConfirmationRequestEntity,
  TelegramIdentityEntity,
  TelegramChatEntity,
] as const;
const apiMigrations = [
  CreateCorePersistenceTables1783296000000,
  CreateProjectsTable1783296060000,
  CreateTasksTable1783296120000,
  CreateTaskSkillsTables1783296180000,
  CreateCommentsTable1783296240000,
  CreateAttachmentsTable1783296300000,
  CreateActivityEventsTable1783296360000,
  CreateAgentRunTables1783296420000,
  CreateConfirmationRequestsTable1783296480000,
  CreateTelegramTables1783296540000,
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
