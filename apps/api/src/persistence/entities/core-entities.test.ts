import assert from "node:assert/strict";
import test from "node:test";
import { getMetadataArgsStorage } from "typeorm";
import {
  ProjectEntity,
  StatusEntity,
  TaskEntity,
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
        table.target === TaskEntity,
    )
    .map((table) => table.name)
    .sort();

  assert.deepEqual(tables, [
    "projects",
    "statuses",
    "tasks",
    "users",
    "workspace_members",
    "workspaces",
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
