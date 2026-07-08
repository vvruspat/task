import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import type {
  AgentRuntime,
  AgentRuntimeResult,
  TelegramAgentRuntimeRequest,
} from "./agent.runtime.js";
import { agentRuntimeNotConnectedResponse } from "./agent.runtime.js";
import { AgentService } from "./agent.service.js";
import type {
  AgentRunStore,
  FindTelegramAgentRunInput,
  PersistTelegramAgentRunInput,
  TelegramAgentRunContextResult,
} from "./agent.store.js";

const input: CreateTelegramAgentRunInput = {
  telegramId: "123456789",
  telegramChatId: "-100987654321",
  sourceMessageId: "42",
  inputText: "@task what is next?",
};

test("AgentService returns a typed Telegram agent run intake response", async () => {
  const store = new RecordingAgentRunStore({
    status: "resolved",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
  });
  const runtime = new RecordingAgentRuntime({
    model: null,
    normalizedIntent: { kind: "pending_agent_runtime" },
    finalResponse: null,
    status: "completed",
    tokenUsage: null,
    cost: null,
    error: null,
  });
  const service = new AgentService(store, runtime);

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
  assert.deepEqual(store.lastContextInput, input);
  assert.deepEqual(runtime.lastRequest, {
    input,
    context: {
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
    },
  });
  assert.deepEqual(store.lastPersistInput, {
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    sourceThreadId: "-100987654321",
    sourceMessageId: "42",
    inputText: "@task what is next?",
    runtimeResult: {
      model: null,
      normalizedIntent: { kind: "pending_agent_runtime" },
      finalResponse: null,
      status: "completed",
      tokenUsage: null,
      cost: null,
      error: null,
    },
  });
});

test("AgentService returns an existing Telegram run without invoking runtime on retries", async () => {
  const existingRun: PersistedAgentRun = {
    id: "44444444-4444-4444-8444-444444444444",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    source: "telegram",
    sourceThreadId: "-100987654321",
    sourceMessageId: "42",
    model: "openai/gpt-4.1-mini",
    inputText: "@task what is next?",
    normalizedIntent: { kind: "openrouter_chat_completion" },
    finalResponse: "Already handled.",
    status: "completed",
    tokenUsage: null,
    cost: null,
    error: null,
    createdAt: new Date("2026-07-08T00:01:00.000Z"),
    updatedAt: new Date("2026-07-08T00:01:00.000Z"),
  };
  const store = new RecordingAgentRunStore(
    {
      status: "resolved",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
    },
    existingRun,
  );
  const runtime = new RecordingAgentRuntime();
  const service = new AgentService(store, runtime);

  assert.deepEqual(
    { ...(await service.createTelegramRun(input)) },
    {
      agentRunId: "44444444-4444-4444-8444-444444444444",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
      source: "telegram",
      sourceMessageId: "42",
      status: "completed",
      responseText: "Already handled.",
      createdAt: "2026-07-08T00:01:00.000Z",
    },
  );
  assert.deepEqual(store.lastFindInput, {
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    sourceThreadId: "-100987654321",
    sourceMessageId: "42",
  });
  assert.equal(runtime.lastRequest, null);
  assert.equal(store.lastPersistInput, null);
});

test("AgentService rejects unlinked Telegram users", async () => {
  const service = new AgentService(
    new RecordingAgentRunStore({ status: "telegram_user_unlinked" }),
    new RecordingAgentRuntime(),
  );

  await assert.rejects(() => service.createTelegramRun(input), NotFoundException);
});

test("AgentService rejects unlinked Telegram chats", async () => {
  const service = new AgentService(
    new RecordingAgentRunStore({ status: "telegram_chat_unlinked" }),
    new RecordingAgentRuntime(),
  );

  await assert.rejects(() => service.createTelegramRun(input), NotFoundException);
});

test("AgentService rejects users outside the Telegram chat workspace", async () => {
  const service = new AgentService(
    new RecordingAgentRunStore({ status: "user_not_in_chat_workspace" }),
    new RecordingAgentRuntime(),
  );

  await assert.rejects(() => service.createTelegramRun(input), ForbiddenException);
});

class RecordingAgentRunStore implements AgentRunStore {
  lastContextInput: CreateTelegramAgentRunInput | null = null;
  lastFindInput: FindTelegramAgentRunInput | null = null;
  lastPersistInput: PersistTelegramAgentRunInput | null = null;

  constructor(
    private readonly contextResult: TelegramAgentRunContextResult,
    private readonly existingRun: PersistedAgentRun | null = null,
  ) {}

  async resolveTelegramRunContext(
    input: CreateTelegramAgentRunInput,
  ): Promise<TelegramAgentRunContextResult> {
    this.lastContextInput = input;

    return this.contextResult;
  }

  async findTelegramRunBySource(
    input: FindTelegramAgentRunInput,
  ): Promise<PersistedAgentRun | null> {
    this.lastFindInput = input;

    return this.existingRun;
  }

  async createTelegramRun(input: PersistTelegramAgentRunInput): Promise<PersistedAgentRun> {
    this.lastPersistInput = input;

    return {
      id: "11111111-1111-4111-8111-111111111111",
      workspaceId: input.workspaceId,
      userId: input.userId,
      source: "telegram",
      sourceThreadId: input.sourceThreadId,
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

class RecordingAgentRuntime implements AgentRuntime {
  lastRequest: TelegramAgentRuntimeRequest | null = null;

  constructor(
    private readonly result: AgentRuntimeResult = {
      model: null,
      normalizedIntent: { kind: "pending_agent_runtime" },
      finalResponse: agentRuntimeNotConnectedResponse,
      status: "completed",
      tokenUsage: null,
      cost: null,
      error: null,
    },
  ) {}

  async handleTelegramRequest(request: TelegramAgentRuntimeRequest): Promise<AgentRuntimeResult> {
    this.lastRequest = request;

    return this.result;
  }
}

type PersistedAgentRun = Awaited<ReturnType<AgentRunStore["createTelegramRun"]>>;
