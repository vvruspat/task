import type { MigrationInterface, QueryRunner } from "typeorm";

export const createIntegrationMcpToolCallsQueries = [
  `CREATE TABLE "integration_mcp_tool_calls" ("id" uuid NOT NULL, "workspace_id" uuid NOT NULL, "user_id" uuid NOT NULL, "tool_name" varchar(64) NOT NULL, "arguments" jsonb NOT NULL DEFAULT '{}'::jsonb, "result" jsonb, "status" text NOT NULL DEFAULT 'running', "error" text, "created_at" timestamptz NOT NULL DEFAULT now(), "completed_at" timestamptz, CONSTRAINT "pk_integration_mcp_tool_calls" PRIMARY KEY ("id"), CONSTRAINT "chk_integration_mcp_tool_calls_status" CHECK ("status" IN ('running', 'success', 'error')), CONSTRAINT "fk_integration_mcp_tool_calls_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE, CONSTRAINT "fk_integration_mcp_tool_calls_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE)`,
  `CREATE INDEX "idx_integration_mcp_tool_calls_workspace_created" ON "integration_mcp_tool_calls" ("workspace_id", "created_at")`,
  `CREATE INDEX "idx_integration_mcp_tool_calls_user_created" ON "integration_mcp_tool_calls" ("user_id", "created_at")`,
  `CREATE INDEX "idx_integration_mcp_tool_calls_status_created" ON "integration_mcp_tool_calls" ("status", "created_at")`,
] as const;

export const dropIntegrationMcpToolCallsQueries = [
  `DROP INDEX "idx_integration_mcp_tool_calls_status_created"`,
  `DROP INDEX "idx_integration_mcp_tool_calls_user_created"`,
  `DROP INDEX "idx_integration_mcp_tool_calls_workspace_created"`,
  `DROP TABLE "integration_mcp_tool_calls"`,
] as const;

export class CreateIntegrationMcpToolCalls1783298220000 implements MigrationInterface {
  name = "CreateIntegrationMcpToolCalls1783298220000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const query of createIntegrationMcpToolCallsQueries) await queryRunner.query(query);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const query of dropIntegrationMcpToolCallsQueries) await queryRunner.query(query);
  }
}
