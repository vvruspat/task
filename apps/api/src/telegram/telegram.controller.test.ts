import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
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
  LinkTelegramIdentityInput,
  LinkTelegramIdentityResult,
  ResolveTelegramContextInput,
  TelegramContextResolution,
  TelegramIdentityLinkStatus,
} from "./telegram.contracts.js";
import { TelegramController, TelegramMiniAppController } from "./telegram.controller.js";
import { TelegramService } from "./telegram.service.js";
import type { TelegramContextStore } from "./telegram.store.js";
import { TelegramMiniAppInitDataVerifier } from "./telegram-mini-app-init-data.verifier.js";

const botToken = "123456:telegram-bot-token";
const now = new Date("2026-07-09T12:00:00.000Z");

test("TelegramController forwards resolve context requests to the service", async () => {
  const store = new RecordingTelegramContextStore({
    status: "resolved",
    userId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    defaultProjectId: null,
  });
  const controller = new TelegramController(
    new TelegramService(store, createMiniAppInitDataVerifier()),
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
    new TelegramService(telegramStore, createMiniAppInitDataVerifier()),
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
    new TelegramService(telegramStore, createMiniAppInitDataVerifier()),
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

test("TelegramMiniAppController verifies initData through the service", () => {
  const controller = new TelegramMiniAppController(
    new TelegramService(
      new RecordingTelegramContextStore({ status: "telegram_user_unlinked" }),
      new TelegramMiniAppInitDataVerifier({
        botToken,
        maxAgeSeconds: 86_400,
        now: () => now,
      }),
    ),
  );
  const authDate = String(Math.floor(now.getTime() / 1000));

  assert.deepEqual(
    {
      ...controller.verifyInitData({
        initData: createSignedInitData({
          authDate,
          userJson: JSON.stringify({ id: 123456789, first_name: "Alex" }),
        }),
      }),
    },
    {
      telegramId: "123456789",
      authDate,
    },
  );
});

test("TelegramMiniAppController links verified initData to the trusted current user", async () => {
  const store = new RecordingTelegramContextStore({ status: "telegram_user_unlinked" });
  const controller = new TelegramMiniAppController(
    new TelegramService(
      store,
      new TelegramMiniAppInitDataVerifier({
        botToken,
        maxAgeSeconds: 86_400,
        now: () => now,
      }),
    ),
  );
  const authDate = String(Math.floor(now.getTime() / 1000));

  assert.deepEqual(
    {
      ...(await controller.linkIdentity("22222222-2222-4222-8222-222222222222", {
        initData: createSignedInitData({
          authDate,
          userJson: JSON.stringify({ id: 123456789, first_name: "Alex" }),
        }),
      })),
    },
    {
      telegramId: "123456789",
      userId: "22222222-2222-4222-8222-222222222222",
    },
  );
  assert.deepEqual(store.lastLinkInput, {
    telegramId: "123456789",
    userId: "22222222-2222-4222-8222-222222222222",
  });
});

test("TelegramMiniAppController maps linked and unlinked identity link statuses", async () => {
  const linkedAt = new Date("2026-07-10T08:00:00.000Z");
  const linkedController = new TelegramMiniAppController(
    new TelegramService(
      new RecordingTelegramContextStore(
        { status: "telegram_user_unlinked" },
        undefined,
        { telegramId: "123456789", linkedAt, lastSeenAt: null },
      ),
      new TelegramMiniAppInitDataVerifier({ botToken, maxAgeSeconds: 86_400, now: () => now }),
    ),
  );

  assert.deepEqual(
    { ...(await linkedController.getIdentityLinkStatus("22222222-2222-4222-8222-222222222222")) },
    { telegramId: "123456789", linkedAt, lastSeenAt: null },
  );

  const unlinkedController = new TelegramMiniAppController(
    new TelegramService(
      new RecordingTelegramContextStore({ status: "telegram_user_unlinked" }),
      new TelegramMiniAppInitDataVerifier({ botToken, maxAgeSeconds: 86_400, now: () => now }),
    ),
  );
  await assert.rejects(
    () => unlinkedController.getIdentityLinkStatus("22222222-2222-4222-8222-222222222222"),
    { name: "ForbiddenException" },
  );
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
  lastLinkInput: LinkTelegramIdentityInput | null = null;

  constructor(
    private readonly resolution: TelegramContextResolution,
    private readonly linkResult: LinkTelegramIdentityResult | undefined = {
      status: "linked",
      identity: {
        telegramId: "123456789",
        userId: "22222222-2222-4222-8222-222222222222",
      },
    },
    private readonly identityLinkStatus: TelegramIdentityLinkStatus | null = null,
  ) {}

  async getIdentityLinkStatus(): Promise<TelegramIdentityLinkStatus | null> {
    return this.identityLinkStatus;
  }

  async resolveContext(input: ResolveTelegramContextInput): Promise<TelegramContextResolution> {
    this.lastInput = input;

    return this.resolution;
  }

  async linkIdentity(input: LinkTelegramIdentityInput): Promise<LinkTelegramIdentityResult> {
    this.lastLinkInput = input;

    return this.linkResult ?? { status: "user_not_found" };
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

function createMiniAppInitDataVerifier(): TelegramMiniAppInitDataVerifier {
  return new TelegramMiniAppInitDataVerifier({
    botToken: null,
    maxAgeSeconds: 86_400,
    now: () => new Date("2026-07-09T12:00:00.000Z"),
  });
}

type SignedInitDataInput = {
  authDate: string;
  userJson: string;
};

function createSignedInitData(input: SignedInitDataInput): string {
  const fields = new URLSearchParams();

  fields.set("auth_date", input.authDate);
  fields.set("user", input.userJson);

  const dataCheckString = [...fields.entries()]
    .sort(([leftKey], [rightKey]) => compareDataCheckKeys(leftKey, rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  fields.set("hash", hash);

  return fields.toString();
}

function compareDataCheckKeys(leftKey: string, rightKey: string): number {
  if (leftKey < rightKey) {
    return -1;
  }

  if (leftKey > rightKey) {
    return 1;
  }

  return 0;
}
