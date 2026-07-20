import type { AgentRuntimeToolCall, TelegramAgentRuntimeContext } from "./agent.runtime.js";

export type AgentToolOperationCall = {
  callId: string;
  toolName: string;
  arguments: Record<string, unknown>;
};

export type AgentToolOperationDispatchResult =
  | {
      status: "success";
      result: Record<string, unknown>;
    }
  | {
      status: "pending";
      result: Record<string, unknown> | null;
    }
  | {
      status: "error";
      result: Record<string, unknown> | null;
      error: string;
    };

export type AgentToolOperationDispatcher = {
  dispatchToolCall(
    call: AgentToolOperationCall,
    context: TelegramAgentRuntimeContext,
  ): Promise<AgentRuntimeToolCall>;
};

export class StaticAgentToolOperationDispatcher implements AgentToolOperationDispatcher {
  constructor(private readonly result: AgentToolOperationDispatchResult = defaultPendingResult) {}

  async dispatchToolCall(
    call: AgentToolOperationCall,
    _context: TelegramAgentRuntimeContext,
  ): Promise<AgentRuntimeToolCall> {
    if (this.result.status === "success") {
      return {
        toolName: call.toolName,
        arguments: call.arguments,
        result: this.result.result,
        status: "success",
        error: null,
        completedAt: new Date(),
      };
    }

    if (this.result.status === "error") {
      return {
        toolName: call.toolName,
        arguments: call.arguments,
        result: this.result.result,
        status: "error",
        error: this.result.error,
        completedAt: new Date(),
      };
    }

    return {
      toolName: call.toolName,
      arguments: call.arguments,
      result: this.result.result,
      status: "pending",
      error: null,
      completedAt: null,
    };
  }
}

const defaultPendingResult: AgentToolOperationDispatchResult = {
  status: "pending",
  result: {
    kind: "backend_operation_dispatch_not_connected",
  },
};
