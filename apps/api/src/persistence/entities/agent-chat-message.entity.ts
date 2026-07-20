import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type {
  AgentChatMessageRecord,
  AgentChatMessageRole,
} from "../types/core-persistence.types.js";

@Entity({ name: "agent_chat_messages" })
@Check("chk_agent_chat_messages_role", `"role" IN ('user', 'assistant')`)
@Index("idx_agent_chat_messages_chat_created", ["chatId", "createdAt"])
@Index("idx_agent_chat_messages_agent_run", ["agentRunId"])
export class AgentChatMessageEntity implements AgentChatMessageRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "chat_id", type: "uuid" })
  chatId = "";

  @Column({ name: "agent_run_id", nullable: true, type: "uuid" })
  agentRunId: string | null = null;

  @Column({ type: "text" })
  role: AgentChatMessageRole = "user";

  @Column({ type: "text" })
  content = "";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);
}
