import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const repairCommentTimestampsSql = [
  `WITH "recovered_comments" AS (
    SELECT
      "comments"."id",
      COALESCE(MIN("activity_events"."created_at"), CURRENT_TIMESTAMP) AS "recovered_at"
    FROM "comments"
    LEFT JOIN "activity_events"
      ON "activity_events"."entity_type" = 'comment'
      AND "activity_events"."entity_id" = "comments"."id"
      AND "activity_events"."event_type" = 'comment.created'
    WHERE "comments"."created_at" <= TIMESTAMPTZ '1970-01-02 00:00:00+00'
    GROUP BY "comments"."id"
  )
  UPDATE "comments"
  SET
    "created_at" = "recovered_comments"."recovered_at",
    "updated_at" = CASE
      WHEN "comments"."updated_at" <= TIMESTAMPTZ '1970-01-02 00:00:00+00'
        THEN "recovered_comments"."recovered_at"
      ELSE "comments"."updated_at"
    END
  FROM "recovered_comments"
  WHERE "comments"."id" = "recovered_comments"."id"`,
] as const;

export class RepairCommentTimestamps1783297140000 implements MigrationInterface {
  name = "RepairCommentTimestamps1783297140000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, repairCommentTimestampsSql);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // This repair is intentionally irreversible: reverting would corrupt valid timestamps again.
  }
}
