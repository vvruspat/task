import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import { AgentService, agentRuntimeNotConnectedResponse } from "./agent.service.js";
import type { AgentRunCreateResult, AgentRunStore } from "./agent.store.js";

const input: CreateTelegramAgentRunInput = {
  telegramId: "123456789",
  telegramChatId: "-100987654321",
  sourceMessageId: "42",
  inputText: "@task what is next?",
};

test("AgentService returns a typed Telegram agent run intake response", async () => {
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
      finalResponse: null,
      status: "completed",
      tokenUsage: null,
      cost: null,
      error: null,
      createdAt: new Date("2026-07-08T00:00:00.000Z"),
      updatedAt: new Date("2026-07-08T00:00:00.000Z"),
    },
  });
  const service = new AgentService(store);

  assert.deepEqual(
    { ...(await service.createTelegramRun(input)) },
    {
      agentRunId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
      source: "telegram",
      sourceMessageId: "42",
      status: "completed",
      responseText: agentRuntimeNotConnectedResponse,
      createdAt: "2026-07-08T00:00:00.000Z",
    },
  );
  assert.deepEqual(store.lastInput, input);
});

test("AgentService rejects unlinked Telegram users", async () => {
  const service = new AgentService(
    new RecordingAgentRunStore({ status: "telegram_user_unlinked" }),
  );

  await assert.rejects(() => service.createTelegramRun(input), NotFoundException);
});

test("AgentService rejects unlinked Telegram chats", async () => {
  const service = new AgentService(
    new RecordingAgentRunStore({ status: "telegram_chat_unlinked" }),
  );

  await assert.rejects(() => service.createTelegramRun(input), NotFoundException);
});

test("AgentService rejects users outside the Telegram chat workspace", async () => {
  const service = new AgentService(
    new RecordingAgentRunStore({ status: "user_not_in_chat_workspace" }),
  );

  await assert.rejects(() => service.createTelegramRun(input), ForbiddenException);
});

class RecordingAgentRunStore implements AgentRunStore {
  lastInput: CreateTelegramAgentRunInput | null = null;

  constructor(private readonly result: AgentRunCreateResult) {}

  async createTelegramRun(input: CreateTelegramAgentRunInput): Promise<AgentRunCreateResult> {
    this.lastInput = input;

    return this.result;
  }
}
