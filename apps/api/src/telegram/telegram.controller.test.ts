import assert from "node:assert/strict";
import test from "node:test";
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
  const controller = new TelegramController(new TelegramService(store));
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

class RecordingTelegramContextStore implements TelegramContextStore {
  lastInput: ResolveTelegramContextInput | null = null;

  constructor(private readonly resolution: TelegramContextResolution) {}

  async resolveContext(input: ResolveTelegramContextInput): Promise<TelegramContextResolution> {
    this.lastInput = input;

    return this.resolution;
  }
}
