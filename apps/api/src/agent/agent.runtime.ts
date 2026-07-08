import { Injectable } from "@nestjs/common";
import type { AgentRunStatus } from "../persistence/types/core-persistence.types.js";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";

export const agentRuntimeNotConnectedResponse =
  "Request recorded. Agent execution is not connected yet.";

export type AgentRuntimeResult = {
  model: string | null;
  normalizedIntent: Record<string, unknown> | null;
  finalResponse: string | null;
  status: AgentRunStatus;
  tokenUsage: Record<string, unknown> | null;
  cost: Record<string, unknown> | null;
  error: string | null;
};

export type TelegramAgentRuntimeContext = {
  workspaceId: string;
  userId: string;
};

export type TelegramAgentRuntimeRequest = {
  input: CreateTelegramAgentRunInput;
  context: TelegramAgentRuntimeContext;
};

export type AgentRuntime = {
  handleTelegramRequest(request: TelegramAgentRuntimeRequest): Promise<AgentRuntimeResult>;
};

@Injectable()
export class StubAgentRuntime implements AgentRuntime {
  async handleTelegramRequest(_request: TelegramAgentRuntimeRequest): Promise<AgentRuntimeResult> {
    return {
      model: null,
      normalizedIntent: { kind: "pending_agent_runtime" },
      finalResponse: agentRuntimeNotConnectedResponse,
      status: "completed",
      tokenUsage: null,
      cost: null,
      error: null,
    };
  }
}
