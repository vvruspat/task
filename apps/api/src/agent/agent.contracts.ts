import type {
  AgentRunSource,
  AgentRunStatus,
} from "../persistence/types/core-persistence.types.js";

export type CreateTelegramAgentRunInput = {
  telegramId: string;
  telegramChatId: string;
  sourceMessageId?: string | null;
  inputText: string;
  attachments: TelegramAgentRunAttachmentInput[];
};

export type TelegramAgentRunDocumentAttachmentInput = {
  kind: "document";
  fileId: string;
  fileUniqueId: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
};

export type TelegramAgentRunPhotoAttachmentInput = {
  kind: "photo";
  fileId: string;
  fileUniqueId: string | null;
  width: number;
  height: number;
  sizeBytes: string | null;
};

export type TelegramAgentRunAttachmentInput =
  | TelegramAgentRunDocumentAttachmentInput
  | TelegramAgentRunPhotoAttachmentInput;

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

export type AgentRunSummary = {
  id: string;
  workspaceId: string;
  userId: string;
  source: AgentRunSource;
  sourceMessageId: string | null;
  model: string | null;
  inputText: string;
  finalResponse: string | null;
  status: AgentRunStatus;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};
