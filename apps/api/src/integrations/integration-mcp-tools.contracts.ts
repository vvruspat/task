import type { IntegrationAgentToolInputSchema } from "@task/integration-sdk";

export type IntegrationMcpToolDefinition = {
  description: string;
  inputSchema: IntegrationAgentToolInputSchema;
  name: string;
  readOnly: true;
};

export type ExecuteIntegrationMcpToolInput = {
  arguments: Readonly<Record<string, unknown>>;
  name: string;
};

export type IntegrationMcpToolExecution = {
  name: string;
  result: Record<string, unknown>;
};

export type IntegrationMcpToolCallStatus = "running" | "success" | "error";

export type IntegrationMcpToolCall = {
  id: string;
  workspaceId: string;
  userId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: IntegrationMcpToolCallStatus;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
};

export type StartIntegrationMcpToolCallInput = {
  workspaceId: string;
  userId: string;
  toolName: string;
  arguments: Record<string, unknown>;
};

export interface IntegrationMcpToolCallStore {
  start(input: StartIntegrationMcpToolCallInput): Promise<string>;
  succeed(toolCallId: string, result: Record<string, unknown>, completedAt: Date): Promise<void>;
  fail(toolCallId: string, error: string, completedAt: Date): Promise<void>;
}
