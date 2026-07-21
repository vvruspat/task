import { DataSource, type DataSourceOptions } from "typeorm";
import type { ApiDatabaseConfig } from "./config.js";
import {
  ActivityEventEntity,
  AgentChatEntity,
  AgentChatMessageEntity,
  AgentRunEntity,
  AgentToolCallEntity,
  AttachmentEntity,
  AuthSessionEntity,
  CommentEntity,
  ConfirmationRequestEntity,
  InviteEntity,
  NotificationReadStateEntity,
  PasswordCredentialEntity,
  ProjectEntity,
  SavedViewEntity,
  StatusEntity,
  TaskEntity,
  TaskSkillEntity,
  TaskSkillVersionEntity,
  TaskSubscriptionEntity,
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
import { CreateInvitesTable1783296600000 } from "./persistence/migrations/1783296600000-create-invites-table.js";
import { AddAgentRunSourceThreadId1783296660000 } from "./persistence/migrations/1783296660000-add-agent-run-source-thread-id.js";
import { CreateSavedViewsTable1783296720000 } from "./persistence/migrations/1783296720000-create-saved-views-table.js";
import { AddProjectIssueIdentifiers1783296780000 } from "./persistence/migrations/1783296780000-add-project-issue-identifiers.js";
import { AddWorkspaceScopedSlugs1783296840000 } from "./persistence/migrations/1783296840000-add-workspace-scoped-slugs.js";
import { MakeStatusesProjectScoped1783296900000 } from "./persistence/migrations/1783296900000-make-statuses-project-scoped.js";
import { AddWorkspaceDescription1783296960000 } from "./persistence/migrations/1783296960000-add-workspace-description.js";
import { AddMatrixSavedViewLayout1783297020000 } from "./persistence/migrations/1783297020000-add-matrix-saved-view-layout.js";
import { AddCommentRepliesAndMentions1783297080000 } from "./persistence/migrations/1783297080000-add-comment-replies-and-mentions.js";
import { RepairCommentTimestamps1783297140000 } from "./persistence/migrations/1783297140000-repair-comment-timestamps.js";
import { AddCommentAgentRun1783297200000 } from "./persistence/migrations/1783297200000-add-comment-agent-run.js";
import { AddTaskNotifications1783297260000 } from "./persistence/migrations/1783297260000-add-task-notifications.js";
import { AddDefaultMyIssuesView1783297320000 } from "./persistence/migrations/1783297320000-add-default-my-issues-view.js";
import { CreateAgentChats1783297380000 } from "./persistence/migrations/1783297380000-create-agent-chats.js";
import { RefreshDefaultProjectStatuses1783297440000 } from "./persistence/migrations/1783297440000-refresh-default-project-statuses.js";
import { RequireTaskStatuses1783297500000 } from "./persistence/migrations/1783297500000-require-task-statuses.js";
import { EnforceRequiredWorkflowStatuses1783297560000 } from "./persistence/migrations/1783297560000-enforce-required-workflow-statuses.js";
import { LightenBacklogStatusColor1783297620000 } from "./persistence/migrations/1783297620000-lighten-backlog-status-color.js";
import { AddEmailPasswordAuth1783297680000 } from "./persistence/migrations/1783297680000-add-email-password-auth.js";
import { AddUserLocale1783297740000 } from "./persistence/migrations/1783297740000-add-user-locale.js";

const apiEntities = [
  WorkspaceEntity,
  UserEntity,
  PasswordCredentialEntity,
  AuthSessionEntity,
  WorkspaceMemberEntity,
  ProjectEntity,
  SavedViewEntity,
  StatusEntity,
  TaskEntity,
  TaskSkillEntity,
  TaskSkillVersionEntity,
  CommentEntity,
  AttachmentEntity,
  ActivityEventEntity,
  AgentChatEntity,
  AgentChatMessageEntity,
  AgentRunEntity,
  AgentToolCallEntity,
  ConfirmationRequestEntity,
  TelegramIdentityEntity,
  TelegramChatEntity,
  InviteEntity,
  TaskSubscriptionEntity,
  NotificationReadStateEntity,
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
  CreateInvitesTable1783296600000,
  AddAgentRunSourceThreadId1783296660000,
  CreateSavedViewsTable1783296720000,
  AddProjectIssueIdentifiers1783296780000,
  AddWorkspaceScopedSlugs1783296840000,
  MakeStatusesProjectScoped1783296900000,
  AddWorkspaceDescription1783296960000,
  AddMatrixSavedViewLayout1783297020000,
  AddCommentRepliesAndMentions1783297080000,
  RepairCommentTimestamps1783297140000,
  AddCommentAgentRun1783297200000,
  AddTaskNotifications1783297260000,
  AddDefaultMyIssuesView1783297320000,
  CreateAgentChats1783297380000,
  RefreshDefaultProjectStatuses1783297440000,
  RequireTaskStatuses1783297500000,
  EnforceRequiredWorkflowStatuses1783297560000,
  LightenBacklogStatusColor1783297620000,
  AddEmailPasswordAuth1783297680000,
  AddUserLocale1783297740000,
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
