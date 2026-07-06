import assert from "node:assert/strict";
import test from "node:test";
import { getMetadataArgsStorage } from "typeorm";
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
        table.target === StatusEntity ||
        table.target === TaskEntity ||
        table.target === TaskSkillEntity ||
        table.target === TaskSkillVersionEntity ||
        table.target === CommentEntity ||
        table.target === AttachmentEntity,
    )
    .map((table) => table.name)
    .sort();

  assert.deepEqual(tables, [
    "attachments",
    "comments",
    "projects",
    "statuses",
    "task_skill_versions",
    "task_skills",
    "tasks",
    "users",
    "workspace_members",
    "workspaces",
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

test("workspace and status uniqueness metadata is registered", () => {
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
  assert.deepEqual(statusUnique?.columns, ["workspaceId", "name"]);
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
  const projectIndexes = storage.indices
    .filter((index) => index.target === ProjectEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(positionColumn?.options.type, "numeric");
  assert.equal(positionColumn?.options.nullable, true);
  assert.equal(archivedAtColumn?.options.type, "timestamptz");
  assert.equal(archivedAtColumn?.options.nullable, true);
  assert.deepEqual(projectIndexes, [
    "idx_projects_created_by_user_id",
    "idx_projects_workspace_id",
    "idx_projects_workspace_id_archived_at",
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
    "idx_comments_workspace_id_author_user_id",
    "idx_comments_workspace_id_task_id",
  ]);
});
