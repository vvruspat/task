import assert from "node:assert/strict";
import test from "node:test";
import type {
  ConfirmationRequestDetail,
  CreateConfirmationRequestInput,
} from "../confirmations/confirmations.contracts.js";
import { ConfirmationsService } from "../confirmations/confirmations.service.js";
import type {
  ConfirmationRequestCancelResult,
  ConfirmationRequestConfirmResult,
  ConfirmationRequestCreateResult,
  ConfirmationRequestsStore,
} from "../confirmations/confirmations.store.js";
import type {
  ResolveTelegramContextInput,
  TelegramContextResolution,
} from "./telegram.contracts.js";
import { TelegramController } from "./telegram.controller.js";
import { TelegramService } from "./telegram.service.js";
import type { TelegramContextStore } from "./telegram.store.js";

test("TelegramController forwards resolve context requests to the service", async () => {
  const store = new RecordingTelegramContextStore({
    status: "resolved",
    userId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    defaultProjectId: null,
  });
  const controller = new TelegramController(
    new TelegramService(store),
    new ConfirmationsService(new RecordingConfirmationRequestsStore()),
  );
  const input = {
    telegramId: "123456789",
    telegramChatId: "-100987654321",
  };

  assert.deepEqual(
    { ...(await controller.resolveContext(input)) },
    {
      status: "resolved",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: null,
    },
  );
  assert.deepEqual(store.lastInput, input);
});

test("TelegramController confirms callbacks after resolving Telegram context", async () => {
  const telegramStore = new RecordingTelegramContextStore({
    status: "resolved",
    userId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    defaultProjectId: null,
  });
  const confirmationsStore = new RecordingConfirmationRequestsStore();
  const controller = new TelegramController(
    new TelegramService(telegramStore),
    new ConfirmationsService(confirmationsStore),
  );

  assert.deepEqual(
    {
      ...(await controller.handleConfirmationCallback({
        telegramId: "123456789",
        telegramChatId: "-100987654321",
        confirmationRequestId: confirmationRequest.id,
        action: "confirm",
      })),
    },
    {
      confirmationRequestId: confirmationRequest.id,
      action: "confirm",
      status: "confirmed",
    },
  );
  assert.deepEqual(confirmationsStore.lastConfirmRequest, {
    workspaceId: "33333333-3333-4333-8333-333333333333",
    confirmationRequestId: confirmationRequest.id,
    userId: "22222222-2222-4222-8222-222222222222",
  });
});

test("TelegramController rejects callbacks when Telegram context is not resolved", async () => {
  const telegramStore = new RecordingTelegramContextStore({ status: "telegram_user_unlinked" });
  const confirmationsStore = new RecordingConfirmationRequestsStore();
  const controller = new TelegramController(
    new TelegramService(telegramStore),
    new ConfirmationsService(confirmationsStore),
  );

  await assert.rejects(
    () =>
      controller.handleConfirmationCallback({
        telegramId: "123456789",
        telegramChatId: "-100987654321",
        confirmationRequestId: confirmationRequest.id,
        action: "cancel",
      }),
    { name: "ForbiddenException" },
  );
  assert.equal(confirmationsStore.lastCancelRequest, null);
});

const confirmationRequest: ConfirmationRequestDetail = {
  id: "11111111-1111-4111-8111-111111111111",
  workspaceId: "33333333-3333-4333-8333-333333333333",
  agentRunId: "44444444-4444-4444-8444-444444444444",
  userId: "22222222-2222-4222-8222-222222222222",
  kind: "task_skill.apply",
  preview: {},
  status: "confirmed",
  expiresAt: new Date("2026-07-08T01:00:00.000Z"),
  createdAt: new Date("2026-07-08T00:00:00.000Z"),
  updatedAt: new Date("2026-07-08T00:30:00.000Z"),
};

class RecordingTelegramContextStore implements TelegramContextStore {
  lastInput: ResolveTelegramContextInput | null = null;

  constructor(private readonly resolution: TelegramContextResolution) {}

  async resolveContext(input: ResolveTelegramContextInput): Promise<TelegramContextResolution> {
    this.lastInput = input;

    return this.resolution;
  }
}

class RecordingConfirmationRequestsStore implements ConfirmationRequestsStore {
  lastConfirmRequest: ConfirmationMutationRequest | null = null;
  lastCancelRequest: ConfirmationMutationRequest | null = null;

  async listPendingForWorkspace(): Promise<ConfirmationRequestDetail[]> {
    return [];
  }

  async getForWorkspace(): Promise<ConfirmationRequestDetail> {
    return confirmationRequest;
  }

  async createForWorkspace(
    _workspaceId: string,
    _userId: string,
    _input: CreateConfirmationRequestInput,
  ): Promise<ConfirmationRequestCreateResult> {
    return { status: "created", confirmationRequest };
  }

  async cancelForWorkspace(
    workspaceId: string,
    confirmationRequestId: string,
    userId: string,
  ): Promise<ConfirmationRequestCancelResult> {
    this.lastCancelRequest = { workspaceId, confirmationRequestId, userId };

    return {
      status: "cancelled",
      confirmationRequest: { ...confirmationRequest, status: "cancelled" },
    };
  }

  async confirmForWorkspace(
    workspaceId: string,
    confirmationRequestId: string,
    userId: string,
  ): Promise<ConfirmationRequestConfirmResult> {
    this.lastConfirmRequest = { workspaceId, confirmationRequestId, userId };

    return { status: "confirmed", confirmationRequest };
  }
}

type ConfirmationMutationRequest = {
  workspaceId: string;
  confirmationRequestId: string;
  userId: string;
};
