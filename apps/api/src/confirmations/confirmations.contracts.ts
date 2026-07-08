import type { ConfirmationRequestStatus } from "../persistence/types/core-persistence.types.js";

export type ConfirmationRequestSummary = {
  id: string;
  workspaceId: string;
  agentRunId: string;
  userId: string;
  kind: string;
  preview: Record<string, unknown>;
  status: ConfirmationRequestStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ConfirmationRequestDetail = ConfirmationRequestSummary;

export type CreateConfirmationRequestInput = {
  agentRunId: string;
  kind: string;
  preview: Record<string, unknown>;
  expiresAt: string;
};
