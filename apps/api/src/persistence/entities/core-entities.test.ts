import assert from "node:assert/strict";
import test from "node:test";
import { getMetadataArgsStorage } from "typeorm";
import {
  ActivityEventEntity,
  AgentRunEntity,
  AgentToolCallEntity,
  AttachmentEntity,
  AuthSessionEntity,
  CommentEntity,
  ConfirmationRequestEntity,
  InviteEntity,
  ProjectEntity,
  SavedViewEntity,
  StatusEntity,
  TaskEntity,
  TaskSkillEntity,
  TaskSkillVersionEntity,
  TelegramChatEntity,
  TelegramIdentityEntity,
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
} from "./index.js";

test("core persistence entities map to the expected table names", () => {
  const storage = getMetadataArgsStorage();
  const tables = storage.tables
    .filter(
      (table) =>
        table.target === WorkspaceEntity ||
        table.target === UserEntity ||
        table.target === WorkspaceMemberEntity ||
        table.target === ProjectEntity ||
        table.target === SavedViewEntity ||
        table.target === StatusEntity ||
        table.target === TaskEntity ||
        table.target === TaskSkillEntity ||
        table.target === TaskSkillVersionEntity ||
        table.target === CommentEntity ||
        table.target === AttachmentEntity ||
        table.target === ActivityEventEntity ||
        table.target === AgentRunEntity ||
        table.target === AgentToolCallEntity ||
        table.target === ConfirmationRequestEntity ||
        table.target === TelegramIdentityEntity ||
        table.target === TelegramChatEntity ||
        table.target === InviteEntity,
    )
    .map((table) => table.name)
    .sort();

  assert.deepEqual(tables, [
    "activity_events",
    "agent_runs",
    "agent_tool_calls",
    "attachments",
    "comments",
    "confirmation_requests",
    "invites",
    "projects",
    "saved_views",
    "statuses",
    "task_skill_versions",
    "task_skills",
    "tasks",
    "telegram_chats",
    "telegram_identities",
    "users",
    "workspace_members",
    "workspaces",
  ]);
});

test("transactionally created entities receive UUIDs before saves", () => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  assert.match(new TaskSkillEntity().id, uuidPattern);
  assert.match(new TaskSkillVersionEntity().id, uuidPattern);
  assert.match(new StatusEntity().id, uuidPattern);
  assert.match(new CommentEntity().id, uuidPattern);
  assert.match(new UserEntity().id, uuidPattern);
  assert.match(new WorkspaceEntity().id, uuidPattern);
  assert.match(new WorkspaceMemberEntity().id, uuidPattern);
  assert.match(new AuthSessionEntity().id, uuidPattern);
  assert.match(new InviteEntity().id, uuidPattern);
});

test("new invitations receive their actual creation time before saves", () => {
  const beforeCreation = Date.now();
  const invitation = new InviteEntity();
  const afterCreation = Date.now();

  assert.ok(invitation.createdAt.getTime() >= beforeCreation);
  assert.ok(invitation.createdAt.getTime() <= afterCreation);
});

test("invite columns, role check, uniqueness, and indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const tokenHashColumn = storage.columns.find(
    (column) => column.target === InviteEntity && column.propertyName === "tokenHash",
  );
  const usedAtColumn = storage.columns.find(
    (column) => column.target === InviteEntity && column.propertyName === "usedAt",
  );
  const inviteChecks = storage.checks
    .filter((check) => check.target === InviteEntity)
    .map((check) => check.name)
    .sort();
  const inviteIndexes = storage.indices
    .filter((index) => index.target === InviteEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(tokenHashColumn?.options.type, "text");
  assert.equal(tokenHashColumn?.options.unique, true);
  assert.equal(usedAtColumn?.options.type, "timestamptz");
  assert.equal(usedAtColumn?.options.nullable, true);
  assert.deepEqual(inviteChecks, ["chk_invites_role"]);
  assert.deepEqual(inviteIndexes, [
    "idx_invites_created_by_user_id",
    "idx_invites_workspace_id_expires_at",
    "idx_invites_workspace_id_invited_user_id",
  ]);
});

test("telegram identity columns and indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const telegramIdColumn = storage.columns.find(
    (column) => column.target === TelegramIdentityEntity && column.propertyName === "telegramId",
  );
  const lastSeenAtColumn = storage.columns.find(
    (column) => column.target === TelegramIdentityEntity && column.propertyName === "lastSeenAt",
  );
  const identityIndexes = storage.indices
    .filter((index) => index.target === TelegramIdentityEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(telegramIdColumn?.options.type, "bigint");
  assert.equal(telegramIdColumn?.options.unique, true);
  assert.equal(lastSeenAtColumn?.options.type, "timestamptz");
  assert.equal(lastSeenAtColumn?.options.nullable, true);
  assert.deepEqual(identityIndexes, ["idx_telegram_identities_user_id"]);
});

test("telegram chat columns and indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const telegramChatIdColumn = storage.columns.find(
    (column) => column.target === TelegramChatEntity && column.propertyName === "telegramChatId",
  );
  const defaultProjectColumn = storage.columns.find(
    (column) => column.target === TelegramChatEntity && column.propertyName === "defaultProjectId",
  );
  const chatIndexes = storage.indices
    .filter((index) => index.target === TelegramChatEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(telegramChatIdColumn?.options.type, "bigint");
  assert.equal(telegramChatIdColumn?.options.unique, true);
  assert.equal(defaultProjectColumn?.options.type, "uuid");
  assert.equal(defaultProjectColumn?.options.nullable, true);
  assert.deepEqual(chatIndexes, [
    "idx_telegram_chats_default_project_id",
    "idx_telegram_chats_linked_by_user_id",
    "idx_telegram_chats_workspace_id",
  ]);
});

test("confirmation request columns, status check, and indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const previewColumn = storage.columns.find(
    (column) => column.target === ConfirmationRequestEntity && column.propertyName === "preview",
  );
  const expiresAtColumn = storage.columns.find(
    (column) => column.target === ConfirmationRequestEntity && column.propertyName === "expiresAt",
  );
  const confirmationChecks = storage.checks
    .filter((check) => check.target === ConfirmationRequestEntity)
    .map((check) => check.name)
    .sort();
  const confirmationIndexes = storage.indices
    .filter((index) => index.target === ConfirmationRequestEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(previewColumn?.options.type, "jsonb");
  assert.equal(expiresAtColumn?.options.type, "timestamptz");
  assert.deepEqual(confirmationChecks, ["chk_confirmation_requests_status"]);
  assert.deepEqual(confirmationIndexes, [
    "idx_confirmation_requests_agent_run_id",
    "idx_confirmation_requests_workspace_id_expires_at",
    "idx_confirmation_requests_workspace_id_user_id_status",
  ]);
});

test("agent run columns, checks, and indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const normalizedIntentColumn = storage.columns.find(
    (column) => column.target === AgentRunEntity && column.propertyName === "normalizedIntent",
  );
  const sourceThreadIdColumn = storage.columns.find(
    (column) => column.target === AgentRunEntity && column.propertyName === "sourceThreadId",
  );
  const tokenUsageColumn = storage.columns.find(
    (column) => column.target === AgentRunEntity && column.propertyName === "tokenUsage",
  );
  const runChecks = storage.checks
    .filter((check) => check.target === AgentRunEntity)
    .map((check) => check.name)
    .sort();
  const runIndexes = storage.indices
    .filter((index) => index.target === AgentRunEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(normalizedIntentColumn?.options.type, "jsonb");
  assert.equal(normalizedIntentColumn?.options.nullable, true);
  assert.equal(sourceThreadIdColumn?.options.name, "source_thread_id");
  assert.equal(sourceThreadIdColumn?.options.type, "text");
  assert.equal(sourceThreadIdColumn?.options.nullable, true);
  assert.equal(tokenUsageColumn?.options.type, "jsonb");
  assert.equal(tokenUsageColumn?.options.nullable, true);
  assert.deepEqual(runChecks, ["chk_agent_runs_source", "chk_agent_runs_status"]);
  assert.deepEqual(runIndexes, [
    "idx_agent_runs_workspace_id_created_at",
    "idx_agent_runs_workspace_id_status",
    "idx_agent_runs_workspace_id_user_id",
    "uq_agent_runs_telegram_source_message",
  ]);
});

test("agent tool call columns, checks, and indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const argumentsColumn = storage.columns.find(
    (column) => column.target === AgentToolCallEntity && column.propertyName === "arguments",
  );
  const completedAtColumn = storage.columns.find(
    (column) => column.target === AgentToolCallEntity && column.propertyName === "completedAt",
  );
  const toolCallChecks = storage.checks
    .filter((check) => check.target === AgentToolCallEntity)
    .map((check) => check.name)
    .sort();
  const toolCallIndexes = storage.indices
    .filter((index) => index.target === AgentToolCallEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(argumentsColumn?.options.type, "jsonb");
  assert.equal(completedAtColumn?.options.type, "timestamptz");
  assert.equal(completedAtColumn?.options.nullable, true);
  assert.deepEqual(toolCallChecks, ["chk_agent_tool_calls_status"]);
  assert.deepEqual(toolCallIndexes, [
    "idx_agent_tool_calls_agent_run_id_created_at",
    "idx_agent_tool_calls_agent_run_id_status",
  ]);
});

test("activity event columns, payload default, and indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const actorUserColumn = storage.columns.find(
    (column) => column.target === ActivityEventEntity && column.propertyName === "actorUserId",
  );
  const payloadColumn = storage.columns.find(
    (column) => column.target === ActivityEventEntity && column.propertyName === "payload",
  );
  const activityIndexes = storage.indices
    .filter((index) => index.target === ActivityEventEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(actorUserColumn?.options.type, "uuid");
  assert.equal(actorUserColumn?.options.nullable, true);
  assert.equal(payloadColumn?.options.type, "jsonb");
  assert.equal(typeof payloadColumn?.options.default, "function");
  if (typeof payloadColumn?.options.default !== "function") {
    throw new Error("Expected activity event payload default to be a SQL expression factory.");
  }
  assert.equal(payloadColumn.options.default(), "'{}'::jsonb");
  assert.deepEqual(activityIndexes, [
    "idx_activity_events_workspace_id_actor_user_id",
    "idx_activity_events_workspace_id_created_at",
    "idx_activity_events_workspace_id_entity",
  ]);
});

test("attachment columns, checks, and lookup indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const targetTypeColumn = storage.columns.find(
    (column) => column.target === AttachmentEntity && column.propertyName === "targetType",
  );
  const kindColumn = storage.columns.find(
    (column) => column.target === AttachmentEntity && column.propertyName === "kind",
  );
  const sizeBytesColumn = storage.columns.find(
    (column) => column.target === AttachmentEntity && column.propertyName === "sizeBytes",
  );
  const attachmentChecks = storage.checks
    .filter((check) => check.target === AttachmentEntity)
    .map((check) => check.name)
    .sort();
  const attachmentIndexes = storage.indices
    .filter((index) => index.target === AttachmentEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(targetTypeColumn?.options.type, "text");
  assert.equal(kindColumn?.options.type, "text");
  assert.equal(sizeBytesColumn?.options.type, "bigint");
  assert.equal(sizeBytesColumn?.options.nullable, true);
  assert.deepEqual(attachmentChecks, ["chk_attachments_kind", "chk_attachments_target_type"]);
  assert.deepEqual(attachmentIndexes, [
    "idx_attachments_workspace_id_created_by_user_id",
    "idx_attachments_workspace_id_target",
  ]);
});

test("workspace and project status uniqueness metadata is registered", () => {
  const storage = getMetadataArgsStorage();
  const workspaceSlugColumn = storage.columns.find(
    (column) => column.target === WorkspaceEntity && column.propertyName === "slug",
  );
  const workspaceMemberUnique = storage.uniques.find(
    (unique) => unique.target === WorkspaceMemberEntity,
  );
  const statusUnique = storage.uniques.find((unique) => unique.target === StatusEntity);

  assert.equal(workspaceSlugColumn?.options.unique, true);
  assert.deepEqual(workspaceMemberUnique?.columns, ["workspaceId", "userId"]);
  assert.deepEqual(statusUnique?.columns, ["projectId", "name"]);
});

test("workspace member role check metadata is registered", () => {
  const storage = getMetadataArgsStorage();
  const workspaceMemberRoleCheck = storage.checks.find(
    (check) => check.target === WorkspaceMemberEntity,
  );

  assert.equal(workspaceMemberRoleCheck?.name, "chk_workspace_members_role");
  assert.equal(
    workspaceMemberRoleCheck?.expression,
    `"role" IN ('owner', 'admin', 'member', 'guest')`,
  );
});

test("status defaults and numeric ordering metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const positionColumn = storage.columns.find(
    (column) => column.target === StatusEntity && column.propertyName === "position",
  );
  const isDoneColumn = storage.columns.find(
    (column) => column.target === StatusEntity && column.propertyName === "isDone",
  );

  assert.equal(positionColumn?.options.type, "numeric");
  assert.equal(isDoneColumn?.options.type, "boolean");
  assert.equal(isDoneColumn?.options.default, false);
});

test("project nullable columns and indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const positionColumn = storage.columns.find(
    (column) => column.target === ProjectEntity && column.propertyName === "position",
  );
  const archivedAtColumn = storage.columns.find(
    (column) => column.target === ProjectEntity && column.propertyName === "archivedAt",
  );
  const keyColumn = storage.columns.find(
    (column) => column.target === ProjectEntity && column.propertyName === "key",
  );
  const nextTaskNumberColumn = storage.columns.find(
    (column) => column.target === ProjectEntity && column.propertyName === "nextTaskNumber",
  );
  const projectIndexes = storage.indices
    .filter((index) => index.target === ProjectEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(positionColumn?.options.type, "numeric");
  assert.equal(positionColumn?.options.nullable, true);
  assert.equal(archivedAtColumn?.options.type, "timestamptz");
  assert.equal(archivedAtColumn?.options.nullable, true);
  assert.equal(keyColumn?.options.type, "text");
  assert.equal(nextTaskNumberColumn?.options.type, "integer");
  assert.equal(nextTaskNumberColumn?.options.default, 1);
  assert.deepEqual(projectIndexes, [
    "idx_projects_created_by_user_id",
    "idx_projects_workspace_id",
    "idx_projects_workspace_id_archived_at",
    "uq_projects_workspace_id_key",
    "uq_projects_workspace_id_slug",
  ]);
});

test("task tree columns, metadata, and indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const positionColumn = storage.columns.find(
    (column) => column.target === TaskEntity && column.propertyName === "position",
  );
  const metadataColumn = storage.columns.find(
    (column) => column.target === TaskEntity && column.propertyName === "metadata",
  );
  const numberColumn = storage.columns.find(
    (column) => column.target === TaskEntity && column.propertyName === "number",
  );
  const sourceSkillColumn = storage.columns.find(
    (column) => column.target === TaskEntity && column.propertyName === "sourceSkillId",
  );
  const sourceSkillVersionColumn = storage.columns.find(
    (column) => column.target === TaskEntity && column.propertyName === "sourceSkillVersionId",
  );
  const taskIndexes = storage.indices
    .filter((index) => index.target === TaskEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(positionColumn?.options.type, "numeric");
  assert.equal(numberColumn?.options.type, "integer");
  assert.equal(metadataColumn?.options.type, "jsonb");
  assert.equal(typeof metadataColumn?.options.default, "function");
  if (typeof metadataColumn?.options.default !== "function") {
    throw new Error("Expected task metadata default to be a SQL expression factory.");
  }
  assert.equal(metadataColumn.options.default(), "'{}'::jsonb");
  assert.equal(sourceSkillColumn?.options.type, "uuid");
  assert.equal(sourceSkillColumn?.options.nullable, true);
  assert.equal(sourceSkillVersionColumn?.options.type, "uuid");
  assert.equal(sourceSkillVersionColumn?.options.nullable, true);
  assert.deepEqual(taskIndexes, [
    "idx_tasks_metadata_gin",
    "idx_tasks_workspace_id_assignee_user_id",
    "idx_tasks_workspace_id_parent_task_id",
    "idx_tasks_workspace_id_project_id",
    "idx_tasks_workspace_id_status_id",
    "uq_tasks_project_id_number",
  ]);
});

test("task skill columns, uniqueness, and indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const aliasesColumn = storage.columns.find(
    (column) => column.target === TaskSkillEntity && column.propertyName === "aliases",
  );
  const archivedAtColumn = storage.columns.find(
    (column) => column.target === TaskSkillEntity && column.propertyName === "archivedAt",
  );
  const taskSkillUnique = storage.uniques.find(
    (unique) =>
      unique.target === TaskSkillEntity && unique.name === "uq_task_skills_workspace_id_name",
  );
  const taskSkillIndexes = storage.indices
    .filter((index) => index.target === TaskSkillEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(aliasesColumn?.options.type, "text");
  assert.equal(aliasesColumn?.options.array, true);
  assert.equal(typeof aliasesColumn?.options.default, "function");
  if (typeof aliasesColumn?.options.default !== "function") {
    throw new Error("Expected task skill aliases default to be a SQL expression factory.");
  }
  assert.equal(aliasesColumn.options.default(), "'{}'::text[]");
  assert.equal(archivedAtColumn?.options.type, "timestamptz");
  assert.equal(archivedAtColumn?.options.nullable, true);
  assert.deepEqual(taskSkillUnique?.columns, ["workspaceId", "name"]);
  assert.deepEqual(taskSkillIndexes, [
    "idx_task_skills_created_by_user_id",
    "idx_task_skills_workspace_id",
    "idx_task_skills_workspace_id_archived_at",
  ]);
});

test("task skill version columns, uniqueness, and indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const versionColumn = storage.columns.find(
    (column) => column.target === TaskSkillVersionEntity && column.propertyName === "version",
  );
  const definitionColumn = storage.columns.find(
    (column) => column.target === TaskSkillVersionEntity && column.propertyName === "definition",
  );
  const versionUnique = storage.uniques.find(
    (unique) =>
      unique.target === TaskSkillVersionEntity &&
      unique.name === "uq_task_skill_versions_task_skill_id_version",
  );
  const versionIndexes = storage.indices
    .filter((index) => index.target === TaskSkillVersionEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(versionColumn?.options.type, "int");
  assert.equal(definitionColumn?.options.type, "jsonb");
  assert.deepEqual(versionUnique?.columns, ["taskSkillId", "version"]);
  assert.deepEqual(versionIndexes, [
    "idx_task_skill_versions_created_by_user_id",
    "idx_task_skill_versions_task_skill_id",
    "idx_task_skill_versions_workspace_id",
  ]);
});

test("comment columns and lookup indexes metadata are registered", () => {
  const storage = getMetadataArgsStorage();
  const bodyColumn = storage.columns.find(
    (column) => column.target === CommentEntity && column.propertyName === "body",
  );
  const createdAtColumn = storage.columns.find(
    (column) => column.target === CommentEntity && column.propertyName === "createdAt",
  );
  const updatedAtColumn = storage.columns.find(
    (column) => column.target === CommentEntity && column.propertyName === "updatedAt",
  );
  const commentIndexes = storage.indices
    .filter((index) => index.target === CommentEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(bodyColumn?.options.type, "text");
  assert.equal(createdAtColumn?.options.type, "timestamptz");
  assert.equal(updatedAtColumn?.options.type, "timestamptz");
  assert.deepEqual(commentIndexes, [
    "idx_comments_agent_run_id",
    "idx_comments_parent_comment_id",
    "idx_comments_workspace_id_author_user_id",
    "idx_comments_workspace_id_task_id",
  ]);
});
