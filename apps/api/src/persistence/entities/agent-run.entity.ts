import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type {
  AgentRunRecord,
  AgentRunSource,
  AgentRunStatus,
} from "../types/core-persistence.types.js";

@Entity({ name: "agent_runs" })
@Check("chk_agent_runs_source", `"source" IN ('telegram', 'web', 'mini_app')`)
@Check(
  "chk_agent_runs_status",
  `"status" IN ('running', 'waiting_confirmation', 'completed', 'failed')`,
)
@Index("idx_agent_runs_workspace_id_created_at", ["workspaceId", "createdAt"])
@Index("idx_agent_runs_workspace_id_user_id", ["workspaceId", "userId"])
@Index("idx_agent_runs_workspace_id_status", ["workspaceId", "status"])
export class AgentRunEntity implements AgentRunRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "user_id", type: "uuid" })
  userId = "";

  @Column({ type: "text" })
  source: AgentRunSource = "web";

  @Column({ name: "source_message_id", nullable: true, type: "text" })
  sourceMessageId: string | null = null;

  @Column({ nullable: true, type: "text" })
  model: string | null = null;

  @Column({ name: "input_text", type: "text" })
  inputText = "";

  @Column({ name: "normalized_intent", nullable: true, type: "jsonb" })
  normalizedIntent: Record<string, unknown> | null = null;

  @Column({ name: "final_response", nullable: true, type: "text" })
  finalResponse: string | null = null;

  @Column({ type: "text" })
  status: AgentRunStatus = "running";

  @Column({ name: "token_usage", nullable: true, type: "jsonb" })
  tokenUsage: Record<string, unknown> | null = null;

  @Column({ nullable: true, type: "jsonb" })
  cost: Record<string, unknown> | null = null;

  @Column({ nullable: true, type: "text" })
  error: string | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date(0);
}
