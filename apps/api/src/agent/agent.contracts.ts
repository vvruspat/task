import type {
  AgentRunSource,
  AgentRunStatus,
} from "../persistence/types/core-persistence.types.js";

export type CreateTelegramAgentRunInput = {
  telegramId: string;
  telegramChatId: string;
  sourceMessageId?: string | null;
  inputText: string;
};

export type AgentRunIntakeResponse = {
  agentRunId: string;
  workspaceId: string;
  userId: string;
  source: AgentRunSource;
  sourceMessageId: string | null;
  status: AgentRunStatus;
  responseText: string;
  createdAt: string;
};
