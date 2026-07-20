import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const lightenBacklogStatusColorSql = [
  `UPDATE "statuses"
   SET "color" = '#D4D4D8'
   WHERE lower(regexp_replace(trim("name"), '\\s+', ' ', 'g')) = 'backlog'`,
] as const;

export const restoreBacklogStatusColorSql = [
  `UPDATE "statuses"
   SET "color" = '#64748B'
   WHERE lower(regexp_replace(trim("name"), '\\s+', ' ', 'g')) = 'backlog'`,
] as const;

export class LightenBacklogStatusColor1783297620000 implements MigrationInterface {
  name = "LightenBacklogStatusColor1783297620000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, lightenBacklogStatusColorSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, restoreBacklogStatusColorSql);
  }
}
