import assert from "node:assert/strict";
import test from "node:test";
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
import { AgentController } from "./agent.controller.js";
import type { AgentRuntime, TelegramAgentRuntimeRequest } from "./agent.runtime.js";
import { AgentService } from "./agent.service.js";
import type {
  AgentRunDetailRecord,
  AgentRunStore,
  FindTelegramAgentRunInput,
  PersistTelegramAgentRunInput,
  TelegramAgentRunContextResult,
} from "./agent.store.js";
import { AgentRunsController } from "./agent-runs.controller.js";

test("AgentController forwards Telegram agent run requests to the service", async () => {
  const store = new RecordingAgentRunStore({
    status: "resolved",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
  });
  const controller = new AgentController(
    new AgentService(store, new StaticAgentRuntime(), createConfirmationsService()),
  );
  const input: CreateTelegramAgentRunInput = {
    telegramId: "123456789",
    telegramChatId: "-100987654321",
    sourceMessageId: "42",
    inputText: "@task what is next?",
    attachments: [
      {
        kind: "photo",
        fileId: "photo-file-id",
        fileUniqueId: null,
        width: 1280,
        height: 720,
        sizeBytes: null,
      },
    ],
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
      pendingConfirmationRequests: [],
      createdAt: "2026-07-08T00:00:00.000Z",
    },
  );
  assert.deepEqual(store.lastContextInput, input);
});

test("AgentRunsController forwards workspace agent run list requests to the service", async () => {
  const store = new RecordingAgentRunStore({
    status: "resolved",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
  });
  const controller = new AgentRunsController(
    new AgentService(store, new StaticAgentRuntime(), createConfirmationsService()),
  );
  const runs = await controller.listWorkspaceRuns(
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
  );

  assert.deepEqual(
    { ...runs[0] },
    {
      id: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
      source: "telegram",
      sourceMessageId: "42",
      model: null,
      inputText: "@task what is next?",
      finalResponse: "Request recorded. Agent execution is not connected yet.",
      status: "completed",
      error: null,
      createdAt: "2026-07-08T00:00:00.000Z",
      updatedAt: "2026-07-08T00:00:00.000Z",
    },
  );
  assert.deepEqual(store.lastListInput, {
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
  });
});

test("AgentRunsController forwards workspace-scoped agent run detail requests", async () => {
  const store = new RecordingAgentRunStore({
    status: "resolved",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
  });
  const controller = new AgentRunsController(
    new AgentService(store, new StaticAgentRuntime(), createConfirmationsService()),
  );

  await assert.rejects(
    () =>
      controller.getWorkspaceRun(
        "22222222-2222-4222-8222-222222222222",
        "11111111-1111-4111-8111-111111111111",
        "33333333-3333-4333-8333-333333333333",
      ),
    { name: "NotFoundException" },
  );
});

class RecordingAgentRunStore implements AgentRunStore {
  lastContextInput: CreateTelegramAgentRunInput | null = null;
  lastListInput: { workspaceId: string; userId: string } | null = null;

  constructor(private readonly contextResult: TelegramAgentRunContextResult) {}

  async resolveTelegramRunContext(
    input: CreateTelegramAgentRunInput,
  ): Promise<TelegramAgentRunContextResult> {
    this.lastContextInput = input;

    return this.contextResult;
  }

  async findTelegramRunBySource(
    _input: FindTelegramAgentRunInput,
  ): Promise<PersistedAgentRun | null> {
    return null;
  }

  async listForWorkspace(workspaceId: string, userId: string): Promise<PersistedAgentRun[]> {
    this.lastListInput = { workspaceId, userId };

    return [
      {
        id: "11111111-1111-4111-8111-111111111111",
        workspaceId,
        userId,
        source: "telegram",
        sourceThreadId: "-100987654321",
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
    ];
  }

  async getDetailForWorkspace(
    _workspaceId: string,
    _agentRunId: string,
    _userId: string,
  ): Promise<AgentRunDetailRecord | null> {
    return null;
  }

  async createTelegramRun(input: PersistTelegramAgentRunInput): Promise<PersistedAgentRun> {
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
      toolCalls: [],
    };
  }
}

function createConfirmationsService(): ConfirmationsService {
  return new ConfirmationsService(new EmptyConfirmationRequestsStore());
}

class EmptyConfirmationRequestsStore implements ConfirmationRequestsStore {
  async listPendingForWorkspace(
    _workspaceId: string,
    _userId: string,
  ): Promise<ConfirmationRequestSummary[]> {
    return [];
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

type AgentRuntimeResult = Awaited<ReturnType<AgentRuntime["handleTelegramRequest"]>>;
type PersistedAgentRun = Awaited<ReturnType<AgentRunStore["createTelegramRun"]>>;
