import assert from "node:assert/strict";
import test from "node:test";
import type {
  ResolveTelegramContextInput,
  TelegramContextResolution,
} from "./telegram.contracts.js";
import { TelegramService } from "./telegram.service.js";
import type { TelegramContextStore } from "./telegram.store.js";

const input: ResolveTelegramContextInput = {
  telegramId: "123456789",
  telegramChatId: "-100987654321",
};

test("TelegramService returns resolved Telegram context", async () => {
  const store = new RecordingTelegramContextStore({
    status: "resolved",
    userId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    defaultProjectId: "44444444-4444-4444-8444-444444444444",
  });
  const service = new TelegramService(store);

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

class RecordingTelegramContextStore implements TelegramContextStore {
  lastInput: ResolveTelegramContextInput | null = null;

  constructor(private readonly resolution: TelegramContextResolution) {}

  async resolveContext(input: ResolveTelegramContextInput): Promise<TelegramContextResolution> {
    this.lastInput = input;

    return this.resolution;
  }
}
