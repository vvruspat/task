import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addCommentRepliesAndMentionsSql = [
  `ALTER TABLE "comments" ADD COLUMN "parent_comment_id" uuid`,
  `ALTER TABLE "comments" ADD COLUMN "mentioned_user_ids" uuid[] NOT NULL DEFAULT '{}'::uuid[]`,
  `ALTER TABLE "comments" ADD CONSTRAINT "fk_comments_parent_comment_id" FOREIGN KEY ("parent_comment_id") REFERENCES "comments" ("id") ON DELETE CASCADE`,
  `CREATE INDEX "idx_comments_parent_comment_id" ON "comments" ("parent_comment_id")`,
] as const;

export const dropCommentRepliesAndMentionsSql = [
  `DROP INDEX "idx_comments_parent_comment_id"`,
  `ALTER TABLE "comments" DROP CONSTRAINT "fk_comments_parent_comment_id"`,
  `ALTER TABLE "comments" DROP COLUMN "mentioned_user_ids"`,
  `ALTER TABLE "comments" DROP COLUMN "parent_comment_id"`,
] as const;

export class AddCommentRepliesAndMentions1783297080000 implements MigrationInterface {
  name = "AddCommentRepliesAndMentions1783297080000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addCommentRepliesAndMentionsSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropCommentRepliesAndMentionsSql);
  }
}
