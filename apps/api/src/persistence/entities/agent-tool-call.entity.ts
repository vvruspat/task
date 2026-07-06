import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { AgentToolCallRecord, AgentToolCallStatus } from "../types/core-persistence.types.js";

@Entity({ name: "agent_tool_calls" })
@Check("chk_agent_tool_calls_status", `"status" IN ('pending', 'success', 'error')`)
@Index("idx_agent_tool_calls_agent_run_id_created_at", ["agentRunId", "createdAt"])
@Index("idx_agent_tool_calls_agent_run_id_status", ["agentRunId", "status"])
export class AgentToolCallEntity implements AgentToolCallRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "agent_run_id", type: "uuid" })
  agentRunId = "";

  @Column({ name: "tool_name", type: "text" })
  toolName = "";

  @Column({ type: "jsonb" })
  arguments: Record<string, unknown> = {};

  @Column({ nullable: true, type: "jsonb" })
  result: Record<string, unknown> | null = null;

  @Column({ type: "text" })
  status: AgentToolCallStatus = "pending";

  @Column({ nullable: true, type: "text" })
  error: string | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);

  @Column({ name: "completed_at", nullable: true, type: "timestamptz" })
  completedAt: Date | null = null;
}
