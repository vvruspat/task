import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createTaskSkillsTablesSql = [
  `CREATE TABLE "task_skills" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "aliases" text[] NOT NULL DEFAULT '{}'::text[],
    "created_by_user_id" uuid NOT NULL,
    "archived_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "fk_task_skills_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_task_skills_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
    CONSTRAINT "uq_task_skills_workspace_id_name" UNIQUE ("workspace_id", "name"),
    CONSTRAINT "uq_task_skills_id_workspace_id" UNIQUE ("id", "workspace_id")
  )`,
  `CREATE TABLE "task_skill_versions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "task_skill_id" uuid NOT NULL,
    "version" int NOT NULL,
    "definition" jsonb NOT NULL,
    "created_by_user_id" uuid NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "fk_task_skill_versions_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_task_skill_versions_task_skill_workspace" FOREIGN KEY ("task_skill_id", "workspace_id") REFERENCES "task_skills" ("id", "workspace_id") ON DELETE NO ACTION,
    CONSTRAINT "fk_task_skill_versions_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
    CONSTRAINT "uq_task_skill_versions_task_skill_id_version" UNIQUE ("task_skill_id", "version"),
    CONSTRAINT "uq_task_skill_versions_id_workspace_id" UNIQUE ("id", "workspace_id"),
    CONSTRAINT "uq_task_skill_versions_id_skill_workspace" UNIQUE ("id", "task_skill_id", "workspace_id")
  )`,
  `CREATE INDEX "idx_task_skills_workspace_id" ON "task_skills" ("workspace_id")`,
  `CREATE INDEX "idx_task_skills_created_by_user_id" ON "task_skills" ("created_by_user_id")`,
  `CREATE INDEX "idx_task_skills_workspace_id_archived_at" ON "task_skills" ("workspace_id", "archived_at")`,
  `CREATE INDEX "idx_task_skill_versions_workspace_id" ON "task_skill_versions" ("workspace_id")`,
  `CREATE INDEX "idx_task_skill_versions_task_skill_id" ON "task_skill_versions" ("task_skill_id")`,
  `CREATE INDEX "idx_task_skill_versions_created_by_user_id" ON "task_skill_versions" ("created_by_user_id")`,
  `ALTER TABLE "tasks" ADD CONSTRAINT "chk_tasks_source_skill_version_requires_skill" CHECK ("source_skill_version_id" IS NULL OR "source_skill_id" IS NOT NULL)`,
  `ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_source_skill_workspace" FOREIGN KEY ("source_skill_id", "workspace_id") REFERENCES "task_skills" ("id", "workspace_id") ON DELETE NO ACTION`,
  `ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_source_skill_version_skill_workspace" FOREIGN KEY ("source_skill_version_id", "source_skill_id", "workspace_id") REFERENCES "task_skill_versions" ("id", "task_skill_id", "workspace_id") ON DELETE NO ACTION`,
] as const;

export const dropTaskSkillsTablesSql = [
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
] as const;

export class CreateTaskSkillsTables1783296180000 implements MigrationInterface {
  name = "CreateTaskSkillsTables1783296180000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createTaskSkillsTablesSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropTaskSkillsTablesSql);
  }
}
