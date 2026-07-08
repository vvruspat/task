import type { AgentRunRecord } from "../persistence/types/core-persistence.types.js";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import type { AgentRuntimeResult } from "./agent.runtime.js";

export type TelegramAgentRunContextResult =
  | {
      status: "resolved";
      workspaceId: string;
      userId: string;
    }
  | {
      status: "telegram_user_unlinked";
    }
  | {
      status: "telegram_chat_unlinked";
    }
  | {
      status: "user_not_in_chat_workspace";
    };

export type PersistTelegramAgentRunInput = {
  workspaceId: string;
  userId: string;
  sourceThreadId: string | null;
  sourceMessageId: string | null;
  inputText: string;
  runtimeResult: AgentRuntimeResult;
};

export type FindTelegramAgentRunInput = {
  workspaceId: string;
  userId: string;
  sourceThreadId: string;
  sourceMessageId: string;
};

export type AgentRunStore = {
  resolveTelegramRunContext(
    input: CreateTelegramAgentRunInput,
  ): Promise<TelegramAgentRunContextResult>;
  listForWorkspace(workspaceId: string, userId: string): Promise<AgentRunRecord[] | null>;
  findTelegramRunBySource(input: FindTelegramAgentRunInput): Promise<AgentRunRecord | null>;
  createTelegramRun(input: PersistTelegramAgentRunInput): Promise<AgentRunRecord>;
};
