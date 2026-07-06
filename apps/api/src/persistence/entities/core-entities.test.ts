import assert from "node:assert/strict";
import test from "node:test";
import { getMetadataArgsStorage } from "typeorm";
import { StatusEntity, UserEntity, WorkspaceEntity, WorkspaceMemberEntity } from "./index.js";

test("core persistence entities map to the expected table names", () => {
  const storage = getMetadataArgsStorage();
  const tables = storage.tables
    .filter(
      (table) =>
        table.target === WorkspaceEntity ||
        table.target === UserEntity ||
        table.target === WorkspaceMemberEntity ||
        table.target === StatusEntity,
    )
    .map((table) => table.name)
    .sort();

  assert.deepEqual(tables, ["statuses", "users", "workspace_members", "workspaces"]);
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
