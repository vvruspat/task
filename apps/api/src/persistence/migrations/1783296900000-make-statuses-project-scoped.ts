import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const makeStatusesProjectScopedSql = [
  `ALTER TABLE "statuses" DROP CONSTRAINT "uq_statuses_workspace_id_name"`,
  `ALTER TABLE "statuses" ADD COLUMN "project_id" uuid`,
  `DO $$
  DECLARE
    project_row record;
    status_row record;
    cloned_status_id uuid;
  BEGIN
    FOR project_row IN SELECT "id", "workspace_id" FROM "projects" LOOP
      FOR status_row IN
        SELECT * FROM "statuses"
        WHERE "workspace_id" = project_row."workspace_id" AND "project_id" IS NULL
        ORDER BY "position", "created_at", "id"
      LOOP
        INSERT INTO "statuses" (
          "workspace_id", "project_id", "name", "color", "position", "is_done", "created_at", "updated_at"
        ) VALUES (
          project_row."workspace_id", project_row."id", status_row."name", status_row."color",
          status_row."position", status_row."is_done", status_row."created_at", status_row."updated_at"
        ) RETURNING "id" INTO cloned_status_id;

        UPDATE "tasks"
        SET "status_id" = cloned_status_id
        WHERE "project_id" = project_row."id" AND "status_id" = status_row."id";
      END LOOP;
    END LOOP;
  END $$`,
  `INSERT INTO "statuses" ("workspace_id", "project_id", "name", "color", "position", "is_done")
   SELECT project."workspace_id", project."id", defaults."name", defaults."color", defaults."position", defaults."is_done"
   FROM "projects" project
   CROSS JOIN (VALUES
     ('Backlog', '#8B8D98', 1000::numeric, false),
     ('Todo', '#5B5BD6', 2000::numeric, false),
     ('In progress', '#3E63DD', 3000::numeric, false),
     ('In review', '#8E4EC6', 4000::numeric, false),
     ('Test', '#D6409F', 5000::numeric, false),
     ('Done', '#30A46C', 6000::numeric, true)
   ) AS defaults("name", "color", "position", "is_done")
   WHERE NOT EXISTS (
     SELECT 1 FROM "statuses" status
     WHERE status."project_id" = project."id" AND lower(status."name") = lower(defaults."name")
   )`,
  `DELETE FROM "statuses" WHERE "project_id" IS NULL`,
  `ALTER TABLE "statuses" ALTER COLUMN "project_id" SET NOT NULL`,
  `ALTER TABLE "statuses" ADD CONSTRAINT "fk_statuses_project_workspace" FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects" ("id", "workspace_id") ON DELETE CASCADE`,
  `ALTER TABLE "statuses" ADD CONSTRAINT "uq_statuses_project_id_name" UNIQUE ("project_id", "name")`,
  `ALTER TABLE "statuses" ADD CONSTRAINT "uq_statuses_id_project_id_workspace_id" UNIQUE ("id", "project_id", "workspace_id")`,
  `ALTER TABLE "tasks" DROP CONSTRAINT "fk_tasks_status_workspace"`,
  `ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_status_project_workspace" FOREIGN KEY ("status_id", "project_id", "workspace_id") REFERENCES "statuses" ("id", "project_id", "workspace_id") ON DELETE SET NULL ("status_id")`,
  `DROP INDEX "idx_statuses_workspace_id"`,
  `CREATE INDEX "idx_statuses_workspace_id_project_id" ON "statuses" ("workspace_id", "project_id")`,
] as const;

export const restoreWorkspaceScopedStatusesSql = [
  `DROP INDEX "idx_statuses_workspace_id_project_id"`,
  `CREATE INDEX "idx_statuses_workspace_id" ON "statuses" ("workspace_id")`,
  `ALTER TABLE "tasks" DROP CONSTRAINT "fk_tasks_status_project_workspace"`,
  `DO $$
  DECLARE
    duplicate_row record;
    keeper_id uuid;
  BEGIN
    FOR duplicate_row IN
      SELECT "workspace_id", "name" FROM "statuses"
      GROUP BY "workspace_id", "name" HAVING count(*) > 1
    LOOP
      SELECT "id" INTO keeper_id FROM "statuses"
      WHERE "workspace_id" = duplicate_row."workspace_id" AND "name" = duplicate_row."name"
      ORDER BY "created_at", "id" LIMIT 1;
      UPDATE "tasks" SET "status_id" = keeper_id
      WHERE "workspace_id" = duplicate_row."workspace_id"
        AND "status_id" IN (
          SELECT "id" FROM "statuses"
          WHERE "workspace_id" = duplicate_row."workspace_id"
            AND "name" = duplicate_row."name"
            AND "id" <> keeper_id
        );
      DELETE FROM "statuses"
      WHERE "workspace_id" = duplicate_row."workspace_id"
        AND "name" = duplicate_row."name"
        AND "id" <> keeper_id;
    END LOOP;
  END $$`,
  `ALTER TABLE "statuses" DROP CONSTRAINT "uq_statuses_id_project_id_workspace_id"`,
  `ALTER TABLE "statuses" DROP CONSTRAINT "uq_statuses_project_id_name"`,
  `ALTER TABLE "statuses" DROP CONSTRAINT "fk_statuses_project_workspace"`,
  `ALTER TABLE "statuses" DROP COLUMN "project_id"`,
  `ALTER TABLE "statuses" ADD CONSTRAINT "uq_statuses_workspace_id_name" UNIQUE ("workspace_id", "name")`,
  `ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_status_workspace" FOREIGN KEY ("status_id", "workspace_id") REFERENCES "statuses" ("id", "workspace_id") ON DELETE SET NULL ("status_id")`,
] as const;

export class MakeStatusesProjectScoped1783296900000 implements MigrationInterface {
  name = "MakeStatusesProjectScoped1783296900000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, makeStatusesProjectScopedSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, restoreWorkspaceScopedStatusesSql);
  }
}
