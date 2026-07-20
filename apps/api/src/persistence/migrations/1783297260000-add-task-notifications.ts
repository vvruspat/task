import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addTaskNotificationsSql = [
  `CREATE TABLE "task_subscriptions" ("workspace_id" uuid NOT NULL, "task_id" uuid NOT NULL, "user_id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_task_subscriptions" PRIMARY KEY ("workspace_id", "task_id", "user_id"), CONSTRAINT "fk_task_subscriptions_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE, CONSTRAINT "fk_task_subscriptions_task" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE, CONSTRAINT "fk_task_subscriptions_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE)`,
  `CREATE INDEX "idx_task_subscriptions_workspace_user" ON "task_subscriptions" ("workspace_id", "user_id")`,
  `CREATE TABLE "notification_read_states" ("workspace_id" uuid NOT NULL, "user_id" uuid NOT NULL, "last_read_at" timestamptz NOT NULL, "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_notification_read_states" PRIMARY KEY ("workspace_id", "user_id"), CONSTRAINT "fk_notification_read_states_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE, CONSTRAINT "fk_notification_read_states_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE)`,
] as const;

export const dropTaskNotificationsSql = [
  `DROP TABLE "notification_read_states"`,
  `DROP TABLE "task_subscriptions"`,
] as const;

export class AddTaskNotifications1783297260000 implements MigrationInterface {
  name = "AddTaskNotifications1783297260000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addTaskNotificationsSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropTaskNotificationsSql);
  }
}
