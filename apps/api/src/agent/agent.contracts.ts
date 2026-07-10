import type {
  AgentRunSource,
  AgentRunStatus,
  AgentToolCallStatus,
  ConfirmationRequestStatus,
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
  pendingConfirmationRequests: AgentRunPendingConfirmationRequest[];
  createdAt: string;
};

export type AgentRunPendingConfirmationRequest = {
  id: string;
  kind: string;
  preview: Record<string, unknown>;
  expiresAt: string;
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

export type AgentRunToolCallAudit = {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: AgentToolCallStatus;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type AgentRunConfirmationLink = {
  id: string;
  kind: string;
  preview: Record<string, unknown>;
  status: ConfirmationRequestStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentRunDetail = AgentRunSummary & {
  toolCalls: AgentRunToolCallAudit[];
  confirmationRequests: AgentRunConfirmationLink[];
};
