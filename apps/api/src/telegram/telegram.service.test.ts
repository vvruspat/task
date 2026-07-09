import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import type {
  LinkTelegramIdentityInput,
  LinkTelegramIdentityResult,
  ResolveTelegramContextInput,
  TelegramContextResolution,
  TelegramIdentityLinkStatus,
} from "./telegram.contracts.js";
import { TelegramService } from "./telegram.service.js";
import type { TelegramContextStore } from "./telegram.store.js";
import { TelegramMiniAppInitDataVerifier } from "./telegram-mini-app-init-data.verifier.js";

const input: ResolveTelegramContextInput = {
  telegramId: "123456789",
  telegramChatId: "-100987654321",
};
const botToken = "123456:telegram-bot-token";
const now = new Date("2026-07-09T12:00:00.000Z");

test("TelegramService returns resolved Telegram context", async () => {
  const store = new RecordingTelegramContextStore({
    status: "resolved",
    userId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    defaultProjectId: "44444444-4444-4444-8444-444444444444",
  });
  const service = new TelegramService(store, createMiniAppInitDataVerifier());

  assert.deepEqual(
    { ...(await service.resolveContext(input)) },
    {
      status: "resolved",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: "44444444-4444-4444-8444-444444444444",
    },
  );
  assert.deepEqual(store.lastInput, input);
});

test("TelegramService returns explicit unlinked user state", async () => {
  const service = new TelegramService(
    new RecordingTelegramContextStore({ status: "telegram_user_unlinked" }),
    createMiniAppInitDataVerifier(),
  );

  assert.deepEqual(
    { ...(await service.resolveContext(input)) },
    {
      status: "telegram_user_unlinked",
    },
  );
});

test("TelegramService returns explicit unlinked chat state", async () => {
  const service = new TelegramService(
    new RecordingTelegramContextStore({
      status: "telegram_chat_unlinked",
      userId: "22222222-2222-4222-8222-222222222222",
    }),
    createMiniAppInitDataVerifier(),
  );

  assert.deepEqual(
    { ...(await service.resolveContext(input)) },
    {
      status: "telegram_chat_unlinked",
      userId: "22222222-2222-4222-8222-222222222222",
    },
  );
});

test("TelegramService returns explicit workspace membership mismatch state", async () => {
  const service = new TelegramService(
    new RecordingTelegramContextStore({
      status: "user_not_in_chat_workspace",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
    }),
    createMiniAppInitDataVerifier(),
  );

  assert.deepEqual(
    { ...(await service.resolveContext(input)) },
    {
      status: "user_not_in_chat_workspace",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
    },
  );
});

test("TelegramService returns the current user's linked Telegram identity status", async () => {
  const linkedAt = new Date("2026-07-10T08:00:00.000Z");
  const service = new TelegramService(
    new RecordingTelegramContextStore(
      { status: "telegram_user_unlinked" },
      undefined,
      { telegramId: "123456789", linkedAt, lastSeenAt: null },
    ),
    createMiniAppInitDataVerifier(),
  );

  assert.deepEqual(
    await service.getMiniAppIdentityLinkStatus("22222222-2222-4222-8222-222222222222"),
    { telegramId: "123456789", linkedAt, lastSeenAt: null },
  );
});

test("TelegramService links verified Mini App identity to the current user", async () => {
  const store = new RecordingTelegramContextStore({ status: "telegram_user_unlinked" });
  const service = new TelegramService(store, createConfiguredMiniAppInitDataVerifier());
  const authDate = String(Math.floor(now.getTime() / 1000));

  assert.deepEqual(
    {
      ...(await service.linkMiniAppIdentity({
        userId: "22222222-2222-4222-8222-222222222222",
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

test("TelegramService rejects linking when the Telegram identity belongs to another user", async () => {
  const store = new RecordingTelegramContextStore(
    { status: "telegram_user_unlinked" },
    {
      status: "telegram_identity_linked_to_different_user",
      telegramId: "123456789",
    },
  );
  const service = new TelegramService(store, createConfiguredMiniAppInitDataVerifier());
  const authDate = String(Math.floor(now.getTime() / 1000));

  await assert.rejects(
    () =>
      service.linkMiniAppIdentity({
        userId: "22222222-2222-4222-8222-222222222222",
        initData: createSignedInitData({
          authDate,
          userJson: JSON.stringify({ id: 123456789, first_name: "Alex" }),
        }),
      }),
    { name: "ConflictException" },
  );
});

test("TelegramService rejects linking for missing current users", async () => {
  const store = new RecordingTelegramContextStore(
    { status: "telegram_user_unlinked" },
    { status: "user_not_found" },
  );
  const service = new TelegramService(store, createConfiguredMiniAppInitDataVerifier());
  const authDate = String(Math.floor(now.getTime() / 1000));

  await assert.rejects(
    () =>
      service.linkMiniAppIdentity({
        userId: "22222222-2222-4222-8222-222222222222",
        initData: createSignedInitData({
          authDate,
          userJson: JSON.stringify({ id: 123456789, first_name: "Alex" }),
        }),
      }),
    { name: "NotFoundException" },
  );
});

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

function createMiniAppInitDataVerifier(): TelegramMiniAppInitDataVerifier {
  return new TelegramMiniAppInitDataVerifier({
    botToken: null,
    maxAgeSeconds: 86_400,
    now: () => now,
  });
}

function createConfiguredMiniAppInitDataVerifier(): TelegramMiniAppInitDataVerifier {
  return new TelegramMiniAppInitDataVerifier({
    botToken,
    maxAgeSeconds: 86_400,
    now: () => now,
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
