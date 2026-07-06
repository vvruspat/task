import assert from "node:assert/strict";
import test from "node:test";
import {
  createTaskSkillsTablesSql,
  dropTaskSkillsTablesSql,
} from "./1783296180000-create-task-skills-tables.js";

test("task skills migration creates skill tables before completing task source foreign keys", () => {
  const createOrAlterSql = createTaskSkillsTablesSql.filter(
    (sql) => sql.startsWith("CREATE TABLE") || sql.startsWith("ALTER TABLE"),
  );

  assert.deepEqual(
    createOrAlterSql.map((sql) => sql.match(/^(CREATE TABLE|ALTER TABLE) "([^"]+)"/)?.[2]),
    ["task_skills", "task_skill_versions", "tasks", "tasks", "tasks"],
  );
});

test("task skills migration creates task_skills with workspace scope and creator restrictions", () => {
  const sql = createTaskSkillsTablesSql.join("\n");

  assert.match(sql, /CREATE TABLE "task_skills"/);
  assert.match(sql, /"workspace_id" uuid NOT NULL/);
  assert.match(sql, /"name" text NOT NULL/);
  assert.match(sql, /"description" text/);
  assert.match(sql, /"aliases" text\[\] NOT NULL DEFAULT '\{\}'::text\[\]/);
  assert.match(sql, /"created_by_user_id" uuid NOT NULL/);
  assert.match(sql, /"archived_at" timestamptz/);
  assert.match(
    sql,
    /CONSTRAINT "fk_task_skills_workspace_id" FOREIGN KEY \("workspace_id"\) REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_task_skills_created_by_user_id" FOREIGN KEY \("created_by_user_id"\) REFERENCES "users" \("id"\) ON DELETE RESTRICT/,
  );
  assert.match(
    sql,
    /CONSTRAINT "uq_task_skills_workspace_id_name" UNIQUE \("workspace_id", "name"\)/,
  );
  assert.match(sql, /CONSTRAINT "uq_task_skills_id_workspace_id" UNIQUE \("id", "workspace_id"\)/);
});

test("task skills migration creates task_skill_versions with tenant-scoped skill linkage", () => {
  const sql = createTaskSkillsTablesSql.join("\n");

  assert.match(sql, /CREATE TABLE "task_skill_versions"/);
  assert.match(sql, /"workspace_id" uuid NOT NULL/);
  assert.match(sql, /"task_skill_id" uuid NOT NULL/);
  assert.match(sql, /"version" int NOT NULL/);
  assert.match(sql, /"definition" jsonb NOT NULL/);
  assert.match(
    sql,
    /CONSTRAINT "fk_task_skill_versions_task_skill_workspace" FOREIGN KEY \("task_skill_id", "workspace_id"\) REFERENCES "task_skills" \("id", "workspace_id"\) ON DELETE NO ACTION/,
  );
  assert.match(
    sql,
    /CONSTRAINT "uq_task_skill_versions_task_skill_id_version" UNIQUE \("task_skill_id", "version"\)/,
  );
  assert.match(
    sql,
    /CONSTRAINT "uq_task_skill_versions_id_skill_workspace" UNIQUE \("id", "task_skill_id", "workspace_id"\)/,
  );
});

test("task skills migration completes deferred task source foreign keys", () => {
  const sql = createTaskSkillsTablesSql.join("\n");

  assert.match(
    sql,
    /ALTER TABLE "tasks" ADD CONSTRAINT "chk_tasks_source_skill_version_requires_skill" CHECK \("source_skill_version_id" IS NULL OR "source_skill_id" IS NOT NULL\)/,
  );
  assert.match(
    sql,
    /ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_source_skill_workspace" FOREIGN KEY \("source_skill_id", "workspace_id"\) REFERENCES "task_skills" \("id", "workspace_id"\) ON DELETE NO ACTION/,
  );
  assert.match(
    sql,
    /ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_source_skill_version_skill_workspace" FOREIGN KEY \("source_skill_version_id", "source_skill_id", "workspace_id"\) REFERENCES "task_skill_versions" \("id", "task_skill_id", "workspace_id"\) ON DELETE NO ACTION/,
  );
});

test("task skills migration includes useful indexes", () => {
  const sql = createTaskSkillsTablesSql.join("\n");

  assert.match(
    sql,
    /CREATE INDEX "idx_task_skills_workspace_id" ON "task_skills" \("workspace_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_task_skills_created_by_user_id" ON "task_skills" \("created_by_user_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_task_skills_workspace_id_archived_at" ON "task_skills" \("workspace_id", "archived_at"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_task_skill_versions_workspace_id" ON "task_skill_versions" \("workspace_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_task_skill_versions_task_skill_id" ON "task_skill_versions" \("task_skill_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_task_skill_versions_created_by_user_id" ON "task_skill_versions" \("created_by_user_id"\)/,
  );
});

test("task skills migration down queries remove task constraints before dropping tables", () => {
  assert.deepEqual(dropTaskSkillsTablesSql, [
    `ALTER TABLE "tasks" DROP CONSTRAINT "fk_tasks_source_skill_version_skill_workspace"`,
    `ALTER TABLE "tasks" DROP CONSTRAINT "fk_tasks_source_skill_workspace"`,
    `ALTER TABLE "tasks" DROP CONSTRAINT "chk_tasks_source_skill_version_requires_skill"`,
    `DROP INDEX "idx_task_skill_versions_created_by_user_id"`,
    `DROP INDEX "idx_task_skill_versions_task_skill_id"`,
    `DROP INDEX "idx_task_skill_versions_workspace_id"`,
    `DROP INDEX "idx_task_skills_workspace_id_archived_at"`,
    `DROP INDEX "idx_task_skills_created_by_user_id"`,
    `DROP INDEX "idx_task_skills_workspace_id"`,
    `DROP TABLE "task_skill_versions"`,
    `DROP TABLE "task_skills"`,
  ]);
});
