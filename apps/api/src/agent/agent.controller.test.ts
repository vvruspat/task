import assert from "node:assert/strict";
import test from "node:test";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import { AgentController } from "./agent.controller.js";
import type { AgentRuntime, TelegramAgentRuntimeRequest } from "./agent.runtime.js";
import { AgentService } from "./agent.service.js";
import type {
  AgentRunStore,
  PersistTelegramAgentRunInput,
  TelegramAgentRunContextResult,
} from "./agent.store.js";

test("AgentController forwards Telegram agent run requests to the service", async () => {
  const store = new RecordingAgentRunStore({
    status: "resolved",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
  });
  const controller = new AgentController(new AgentService(store, new StaticAgentRuntime()));
  const input: CreateTelegramAgentRunInput = {
    telegramId: "123456789",
    telegramChatId: "-100987654321",
    sourceMessageId: "42",
    inputText: "@task what is next?",
  };

  assert.deepEqual(
    { ...(await controller.createTelegramRun(input)) },
    {
      agentRunId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
      source: "telegram",
      sourceMessageId: "42",
      status: "completed",
      responseText: "Request recorded. Agent execution is not connected yet.",
      createdAt: "2026-07-08T00:00:00.000Z",
    },
  );
  assert.deepEqual(store.lastContextInput, input);
});

class RecordingAgentRunStore implements AgentRunStore {
  lastContextInput: CreateTelegramAgentRunInput | null = null;

  constructor(private readonly contextResult: TelegramAgentRunContextResult) {}

  async resolveTelegramRunContext(
    input: CreateTelegramAgentRunInput,
  ): Promise<TelegramAgentRunContextResult> {
    this.lastContextInput = input;

    return this.contextResult;
  }

  async createTelegramRun(input: PersistTelegramAgentRunInput): Promise<PersistedAgentRun> {
    return {
      id: "11111111-1111-4111-8111-111111111111",
      workspaceId: input.workspaceId,
      userId: input.userId,
      source: "telegram",
      sourceMessageId: input.sourceMessageId,
      model: input.runtimeResult.model,
      inputText: input.inputText,
      normalizedIntent: input.runtimeResult.normalizedIntent,
      finalResponse: input.runtimeResult.finalResponse,
      status: input.runtimeResult.status,
      tokenUsage: input.runtimeResult.tokenUsage,
      cost: input.runtimeResult.cost,
      error: input.runtimeResult.error,
      createdAt: new Date("2026-07-08T00:00:00.000Z"),
      updatedAt: new Date("2026-07-08T00:00:00.000Z"),
    };
  }
}

class StaticAgentRuntime implements AgentRuntime {
  async handleTelegramRequest(_request: TelegramAgentRuntimeRequest): Promise<AgentRuntimeResult> {
    return {
      model: null,
      normalizedIntent: { kind: "pending_agent_runtime" },
      finalResponse: "Request recorded. Agent execution is not connected yet.",
      status: "completed",
      tokenUsage: null,
      cost: null,
      error: null,
    };
  }
}

type AgentRuntimeResult = Awaited<ReturnType<AgentRuntime["handleTelegramRequest"]>>;
type PersistedAgentRun = Awaited<ReturnType<AgentRunStore["createTelegramRun"]>>;
