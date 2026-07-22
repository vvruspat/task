import { randomUUID } from "node:crypto";
import { Check, Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";
import type {
  IntegrationMcpToolCall,
  IntegrationMcpToolCallStatus,
} from "../../integrations/integration-mcp-tools.contracts.js";

@Entity({ name: "integration_mcp_tool_calls" })
@Check("chk_integration_mcp_tool_calls_status", `"status" IN ('running', 'success', 'error')`)
@Index("idx_integration_mcp_tool_calls_workspace_created", ["workspaceId", "createdAt"])
@Index("idx_integration_mcp_tool_calls_user_created", ["userId", "createdAt"])
@Index("idx_integration_mcp_tool_calls_status_created", ["status", "createdAt"])
export class IntegrationMcpToolCallEntity implements IntegrationMcpToolCall {
  @PrimaryColumn({ type: "uuid" })
  id: string = randomUUID();

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "user_id", type: "uuid" })
  userId = "";

  @Column({ length: 64, name: "tool_name", type: "varchar" })
  toolName = "";

  @Column({ type: "jsonb" })
  arguments: Record<string, unknown> = {};

  @Column({ nullable: true, type: "jsonb" })
  result: Record<string, unknown> | null = null;

  @Column({ default: "running", type: "text" })
  status: IntegrationMcpToolCallStatus = "running";

  @Column({ nullable: true, type: "text" })
  error: string | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @Column({ name: "completed_at", nullable: true, type: "timestamptz" })
  completedAt: Date | null = null;
}
