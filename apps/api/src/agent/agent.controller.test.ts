import assert from "node:assert/strict";
import test from "node:test";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import { AgentController } from "./agent.controller.js";
import { AgentService } from "./agent.service.js";
import type { AgentRunCreateResult, AgentRunStore } from "./agent.store.js";

test("AgentController forwards Telegram agent run requests to the service", async () => {
  const store = new RecordingAgentRunStore({
    status: "created",
    run: {
      id: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
      source: "telegram",
      sourceMessageId: "42",
      model: null,
      inputText: "@task what is next?",
      normalizedIntent: { kind: "pending_agent_runtime" },
      finalResponse: "Request recorded. Agent execution is not connected yet.",
      status: "completed",
      tokenUsage: null,
      cost: null,
      error: null,
      createdAt: new Date("2026-07-08T00:00:00.000Z"),
      updatedAt: new Date("2026-07-08T00:00:00.000Z"),
    },
  });
  const controller = new AgentController(new AgentService(store));
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
  assert.deepEqual(store.lastInput, input);
});

class RecordingAgentRunStore implements AgentRunStore {
  lastInput: CreateTelegramAgentRunInput | null = null;

  constructor(private readonly result: AgentRunCreateResult) {}

  async createTelegramRun(input: CreateTelegramAgentRunInput): Promise<AgentRunCreateResult> {
    this.lastInput = input;

    return this.result;
  }
}
