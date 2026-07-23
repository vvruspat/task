import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type {
  ConfirmationRequestDetail,
  ConfirmationRequestSummary,
  CreateConfirmationRequestInput,
} from "../confirmations/confirmations.contracts.js";
import { ConfirmationsService } from "../confirmations/confirmations.service.js";
import type {
  ConfirmationRequestCancelResult,
  ConfirmationRequestConfirmResult,
  ConfirmationRequestCreateResult,
  ConfirmationRequestsStore,
} from "../confirmations/confirmations.store.js";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import type {
  AgentRuntime,
  AgentRuntimeResult,
  TelegramAgentRuntimeRequest,
} from "./agent.runtime.js";
import { agentRuntimeNotConnectedResponse } from "./agent.runtime.js";
import { AgentService } from "./agent.service.js";
import type {
  AgentRunDetailRecord,
  AgentRunStore,
  FindTelegramAgentRunInput,
  ListTelegramConversationInput,
  PersistTelegramAgentRunInput,
  PersistWebAgentRunInput,
  TelegramAgentRunContextResult,
} from "./agent.store.js";

const input: CreateTelegramAgentRunInput = {
  telegramId: "123456789",
  telegramChatId: "-100987654321",
  sourceMessageId: "42",
  inputText: "@task what is next?",
  attachments: [
    {
      kind: "document",
      fileId: "document-file-id",
      fileUniqueId: "document-unique-id",
      fileName: "chart.pdf",
      mimeType: "application/pdf",
      sizeBytes: "1024",
    },
  ],
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
    toolCalls: [],
  });
  const service = new AgentService(store, runtime, createConfirmationsService());

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
      pendingConfirmationRequests: [],
      createdAt: "2026-07-08T00:00:00.000Z",
    },
  );
  assert.deepEqual(store.lastContextInput, input);
  assert.deepEqual(runtime.lastRequest, {
    input,
    context: {
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
      projectId: null,
    },
    conversation: [{ role: "user", content: "@task what is next?" }],
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
      toolCalls: [],
    },
  });
});

test("AgentService carries Telegram topic history and selected project into the shared runtime", async () => {
  const selectedProjectId = "44444444-4444-4444-8444-444444444444";
  const previousRun: PersistedAgentRun = {
    id: "55555555-5555-4555-8555-555555555555",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "66666666-6666-4666-8666-666666666666",
    source: "telegram",
    sourceThreadId: "-100987654321:topic:17",
    sourceMessageId: "40",
    model: "openai/gpt-4.1-mini",
    inputText: "Какие проекты у нас есть?",
    normalizedIntent: { kind: "openrouter_chat_completion" },
    finalResponse: "Есть проект Album.",
    status: "completed",
    tokenUsage: null,
    cost: null,
    error: null,
    createdAt: new Date("2026-07-08T00:00:00.000Z"),
    updatedAt: new Date("2026-07-08T00:00:01.000Z"),
  };
  const store = new RecordingAgentRunStore(
    {
      status: "resolved",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: selectedProjectId,
    },
    null,
    [],
    [previousRun],
  );
  const runtime = new RecordingAgentRuntime();
  const service = new AgentService(store, runtime, createConfirmationsService());
  const topicInput: CreateTelegramAgentRunInput = {
    ...input,
    telegramThreadId: "17",
    sourceMessageId: "42",
    inputText: "А какие задачи в нём?",
  };

  await service.createTelegramRun(topicInput);

  assert.deepEqual(store.lastConversationInput, {
    workspaceId: "22222222-2222-4222-8222-222222222222",
    sourceThreadId: "-100987654321:topic:17",
    limit: 20,
  });
  assert.deepEqual(runtime.lastRequest, {
    input: topicInput,
    context: {
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
      projectId: selectedProjectId,
    },
    conversation: [
      { role: "user", content: "Какие проекты у нас есть?" },
      { role: "assistant", content: "Есть проект Album." },
      { role: "user", content: "А какие задачи в нём?" },
    ],
  });
  assert.equal(store.lastPersistInput?.sourceThreadId, "-100987654321:topic:17");
});

test("AgentService passes runtime tool-call logs to persistence", async () => {
  const store = new RecordingAgentRunStore({
    status: "resolved",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
  });
  const runtime = new RecordingAgentRuntime({
    model: "openai/gpt-4.1-mini",
    normalizedIntent: {
      kind: "mocked_tool_execution",
      source: "telegram",
    },
    finalResponse: "Task created.",
    status: "completed",
    tokenUsage: null,
    cost: null,
    error: null,
    toolCalls: [
      {
        toolName: "tasks.create",
        arguments: {
          title: "Follow up with Marina",
        },
        result: {
          taskId: "55555555-5555-4555-8555-555555555555",
        },
        status: "success",
        error: null,
        completedAt: new Date("2026-07-08T00:00:03.000Z"),
      },
    ],
  });
  const service = new AgentService(store, runtime, createConfirmationsService());

  await service.createTelegramRun(input);

  assert.deepEqual(store.lastPersistInput?.runtimeResult.toolCalls, [
    {
      toolName: "tasks.create",
      arguments: {
        title: "Follow up with Marina",
      },
      result: {
        taskId: "55555555-5555-4555-8555-555555555555",
      },
      status: "success",
      error: null,
      completedAt: new Date("2026-07-08T00:00:03.000Z"),
    },
  ]);
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
  const service = new AgentService(store, runtime, createConfirmationsService());

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
      pendingConfirmationRequests: [],
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

test("AgentService includes pending confirmation requests for waiting Telegram runs", async () => {
  const store = new RecordingAgentRunStore({
    status: "resolved",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
  });
  const runtime = new RecordingAgentRuntime({
    model: "openai/gpt-4.1-mini",
    normalizedIntent: { kind: "openrouter_chat_completion" },
    finalResponse: "Нужно подтверждение.",
    status: "waiting_confirmation",
    tokenUsage: null,
    cost: null,
    error: null,
    toolCalls: [],
  });
  const service = new AgentService(
    store,
    runtime,
    createConfirmationsService([
      createConfirmationRequestSummary({
        id: "55555555-5555-4555-8555-555555555555",
        agentRunId: "11111111-1111-4111-8111-111111111111",
      }),
      createConfirmationRequestSummary({
        id: "66666666-6666-4666-8666-666666666666",
        agentRunId: "44444444-4444-4444-8444-444444444444",
      }),
    ]),
  );

  const response = await service.createTelegramRun(input);

  assert.deepEqual(
    response.pendingConfirmationRequests.map((request) => ({ ...request })),
    [
      {
        id: "55555555-5555-4555-8555-555555555555",
        kind: "task.create",
        preview: { title: "Записать бас" },
        expiresAt: "2026-07-08T01:00:00.000Z",
      },
    ],
  );
});

test("AgentService lists workspace agent runs as summary DTOs", async () => {
  const store = new RecordingAgentRunStore(
    {
      status: "resolved",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
    },
    null,
    [
      {
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
        updatedAt: new Date("2026-07-08T00:02:00.000Z"),
      },
    ],
  );
  const service = new AgentService(
    store,
    new RecordingAgentRuntime(),
    createConfirmationsService(),
  );

  assert.deepEqual(
    (
      await service.listWorkspaceRuns(
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      )
    ).map((run) => ({ ...run })),
    [
      {
        id: "44444444-4444-4444-8444-444444444444",
        workspaceId: "22222222-2222-4222-8222-222222222222",
        userId: "33333333-3333-4333-8333-333333333333",
        source: "telegram",
        sourceMessageId: "42",
        model: "openai/gpt-4.1-mini",
        inputText: "@task what is next?",
        finalResponse: "Already handled.",
        status: "completed",
        error: null,
        createdAt: "2026-07-08T00:01:00.000Z",
        updatedAt: "2026-07-08T00:02:00.000Z",
      },
    ],
  );
  assert.deepEqual(store.lastListInput, {
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
  });
});

test("AgentService redacts sensitive strings in agent run summaries", async () => {
  const store = new RecordingAgentRunStore(
    {
      status: "resolved",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
    },
    null,
    [
      {
        id: "44444444-4444-4444-8444-444444444444",
        workspaceId: "22222222-2222-4222-8222-222222222222",
        userId: "33333333-3333-4333-8333-333333333333",
        source: "telegram",
        sourceThreadId: "-100987654321",
        sourceMessageId: "42",
        model: null,
        inputText: "@task access_token=list-secret",
        normalizedIntent: null,
        finalResponse: "Open https://api.example.test/?X-Amz-Signature=list-secret",
        status: "failed",
        tokenUsage: null,
        cost: null,
        error: "Request failed: Bearer list-secret",
        createdAt: new Date("2026-07-08T00:01:00.000Z"),
        updatedAt: new Date("2026-07-08T00:02:00.000Z"),
      },
    ],
  );
  const service = new AgentService(
    store,
    new RecordingAgentRuntime(),
    createConfirmationsService(),
  );

  const response = await service.listWorkspaceRuns(
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
  );

  assert.equal(response[0]?.inputText, "@task access_token=[REDACTED]");
  assert.equal(
    response[0]?.finalResponse,
    "Open https://api.example.test/?X-Amz-Signature=%5BREDACTED%5D",
  );
  assert.equal(response[0]?.error, "Request failed: Bearer [REDACTED]");
});

test("AgentService hides agent runs for inaccessible workspaces", async () => {
  const store = new RecordingAgentRunStore(
    {
      status: "resolved",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
    },
    null,
    null,
  );
  const service = new AgentService(
    store,
    new RecordingAgentRuntime(),
    createConfirmationsService(),
  );

  await assert.rejects(
    () =>
      service.listWorkspaceRuns(
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      ),
    NotFoundException,
  );
});

test("AgentService redacts every externally returned agent audit surface", async () => {
  const store = new RecordingAgentRunStore({
    status: "resolved",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
  });
  store.detailResult = createAgentRunDetailRecord();
  const service = new AgentService(
    store,
    new RecordingAgentRuntime(),
    createConfirmationsService(),
  );

  const response = await service.getWorkspaceRun(
    "22222222-2222-4222-8222-222222222222",
    "11111111-1111-4111-8111-111111111111",
    "33333333-3333-4333-8333-333333333333",
  );

  assert.deepEqual(response.toolCalls[0]?.arguments, {
    authorization: "[REDACTED]",
    nested: {
      apiKey: "[REDACTED]",
      privateKey: "[REDACTED]",
      signedUrl:
        "https://signed.example.test/?X-Amz-Signature=%5BREDACTED%5D&sig=%5BREDACTED%5D&assertion=%5BREDACTED%5D&code=%5BREDACTED%5D",
      title: "Follow up",
      url: "https://api.example.test/tasks?access_token=%5BREDACTED%5D",
      userInfoUrl: "https://%5BREDACTED%5D:%5BREDACTED%5D@api.example.test/tasks",
    },
  });
  assert.deepEqual(response.toolCalls[0]?.result, { accessToken: "[REDACTED]" });
  assert.equal(
    response.toolCalls[0]?.error,
    "Request failed: Bearer [REDACTED] https://api.example.test/?token=%5BREDACTED%5D",
  );
  assert.deepEqual(response.confirmationRequests[0]?.preview, {
    accessKey: "[REDACTED]",
    url: "https://api.example.test/?private_key=%5BREDACTED%5D",
  });
  assert.equal(response.inputText, "@task access_token=[REDACTED]");
  assert.equal(response.finalResponse, "Open https://api.example.test/?token=%5BREDACTED%5D");
  assert.equal(response.error, "Credential error: client_secret=[REDACTED]");
});

test("AgentService hides missing or inaccessible agent run details", async () => {
  const service = new AgentService(
    new RecordingAgentRunStore({
      status: "resolved",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
    }),
    new RecordingAgentRuntime(),
    createConfirmationsService(),
  );

  await assert.rejects(
    () =>
      service.getWorkspaceRun(
        "22222222-2222-4222-8222-222222222222",
        "11111111-1111-4111-8111-111111111111",
        "33333333-3333-4333-8333-333333333333",
      ),
    NotFoundException,
  );
});

test("AgentService rejects unlinked Telegram users", async () => {
  const service = new AgentService(
    new RecordingAgentRunStore({ status: "telegram_user_unlinked" }),
    new RecordingAgentRuntime(),
    createConfirmationsService(),
  );

  await assert.rejects(() => service.createTelegramRun(input), NotFoundException);
});

test("AgentService rejects unlinked Telegram chats", async () => {
  const service = new AgentService(
    new RecordingAgentRunStore({ status: "telegram_chat_unlinked" }),
    new RecordingAgentRuntime(),
    createConfirmationsService(),
  );

  await assert.rejects(() => service.createTelegramRun(input), NotFoundException);
});

test("AgentService rejects users outside the Telegram chat workspace", async () => {
  const service = new AgentService(
    new RecordingAgentRunStore({ status: "user_not_in_chat_workspace" }),
    new RecordingAgentRuntime(),
    createConfirmationsService(),
  );

  await assert.rejects(() => service.createTelegramRun(input), ForbiddenException);
});

class RecordingAgentRunStore implements AgentRunStore {
  lastContextInput: CreateTelegramAgentRunInput | null = null;
  lastFindInput: FindTelegramAgentRunInput | null = null;
  lastConversationInput: ListTelegramConversationInput | null = null;
  lastListInput: { workspaceId: string; userId: string } | null = null;
  lastPersistInput: PersistTelegramAgentRunInput | null = null;
  detailResult: AgentRunDetailRecord | null = null;

  constructor(
    private readonly contextResult: TelegramAgentRunContextResult,
    private readonly existingRun: PersistedAgentRun | null = null,
    private readonly workspaceRuns: PersistedAgentRun[] | null = [],
    private readonly conversationRuns: PersistedAgentRun[] = [],
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

  async listForWorkspace(workspaceId: string, userId: string): Promise<PersistedAgentRun[] | null> {
    this.lastListInput = { workspaceId, userId };

    return this.workspaceRuns;
  }

  async listTelegramConversation(
    input: ListTelegramConversationInput,
  ): Promise<PersistedAgentRun[]> {
    this.lastConversationInput = input;
    return this.conversationRuns;
  }

  async getDetailForWorkspace(
    _workspaceId: string,
    _agentRunId: string,
    _userId: string,
  ): Promise<AgentRunDetailRecord | null> {
    return this.detailResult;
  }

  async isWorkspaceMember(_workspaceId: string, _userId: string): Promise<boolean> {
    return true;
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

  async createWebRun(input: PersistWebAgentRunInput): Promise<PersistedAgentRun> {
    return {
      ...(await this.createTelegramRun({ ...input, sourceThreadId: null, sourceMessageId: null })),
      source: "web",
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
      toolCalls: [],
    },
  ) {}

  async handleTelegramRequest(request: TelegramAgentRuntimeRequest): Promise<AgentRuntimeResult> {
    this.lastRequest = request;

    return this.result;
  }
}

function createConfirmationsService(
  requests: ConfirmationRequestSummary[] = [],
): ConfirmationsService {
  return new ConfirmationsService(new RecordingConfirmationRequestsStore(requests));
}

function createConfirmationRequestSummary(
  overrides: Pick<ConfirmationRequestSummary, "id" | "agentRunId">,
): ConfirmationRequestSummary {
  return {
    id: overrides.id,
    workspaceId: "22222222-2222-4222-8222-222222222222",
    agentRunId: overrides.agentRunId,
    userId: "33333333-3333-4333-8333-333333333333",
    kind: "task.create",
    preview: { title: "Записать бас" },
    status: "pending",
    expiresAt: new Date("2026-07-08T01:00:00.000Z"),
    createdAt: new Date("2026-07-08T00:00:00.000Z"),
    updatedAt: new Date("2026-07-08T00:00:00.000Z"),
  };
}

class RecordingConfirmationRequestsStore implements ConfirmationRequestsStore {
  constructor(private readonly requests: ConfirmationRequestSummary[]) {}

  async listPendingForWorkspace(
    _workspaceId: string,
    _userId: string,
  ): Promise<ConfirmationRequestSummary[]> {
    return this.requests;
  }

  async getForWorkspace(
    _workspaceId: string,
    _confirmationRequestId: string,
    _userId: string,
  ): Promise<ConfirmationRequestDetail | null> {
    return null;
  }

  async createForWorkspace(
    _workspaceId: string,
    _userId: string,
    _input: CreateConfirmationRequestInput,
  ): Promise<ConfirmationRequestCreateResult> {
    return { status: "workspace_not_found" };
  }

  async cancelForWorkspace(
    _workspaceId: string,
    _confirmationRequestId: string,
    _userId: string,
  ): Promise<ConfirmationRequestCancelResult> {
    return { status: "workspace_not_found" };
  }

  async confirmForWorkspace(
    _workspaceId: string,
    _confirmationRequestId: string,
    _userId: string,
  ): Promise<ConfirmationRequestConfirmResult> {
    return { status: "workspace_not_found" };
  }
}

type PersistedAgentRun = Awaited<ReturnType<AgentRunStore["createTelegramRun"]>>;

function createAgentRunDetailRecord(): AgentRunDetailRecord {
  const run: PersistedAgentRun = {
    id: "11111111-1111-4111-8111-111111111111",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    source: "telegram",
    sourceThreadId: "-100987654321",
    sourceMessageId: "42",
    model: null,
    inputText: "@task access_token=run-secret",
    normalizedIntent: null,
    finalResponse: "Open https://api.example.test/?token=run-secret",
    status: "waiting_confirmation",
    tokenUsage: null,
    cost: null,
    error: "Credential error: client_secret=run-secret",
    createdAt: new Date("2026-07-08T00:00:00.000Z"),
    updatedAt: new Date("2026-07-08T00:00:00.000Z"),
  };

  return {
    run,
    toolCalls: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        agentRunId: run.id,
        toolName: "tasks.create",
        arguments: {
          authorization: "Bearer secret",
          nested: {
            apiKey: "private",
            privateKey: "private",
            signedUrl:
              "https://signed.example.test/?X-Amz-Signature=private&sig=private&assertion=private&code=private",
            title: "Follow up",
            url: "https://api.example.test/tasks?access_token=private",
            userInfoUrl: "https://private-user:private-password@api.example.test/tasks",
          },
        },
        result: { accessToken: "private" },
        status: "success",
        error: "Request failed: Bearer private https://api.example.test/?token=private",
        createdAt: new Date("2026-07-08T00:00:01.000Z"),
        completedAt: new Date("2026-07-08T00:00:02.000Z"),
      },
    ],
    confirmationRequests: [
      {
        ...createConfirmationRequestSummary({
          id: "55555555-5555-4555-8555-555555555555",
          agentRunId: run.id,
        }),
        preview: {
          accessKey: "private",
          url: "https://api.example.test/?private_key=private",
        },
      },
    ],
  };
}
