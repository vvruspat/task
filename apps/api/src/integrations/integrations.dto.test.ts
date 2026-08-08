import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ParseUpdateTelegramConnectionSettingsBodyPipe } from "./integrations.dto.js";

test("Telegram connection settings parser accepts a boolean history switch", () => {
  const pipe = new ParseUpdateTelegramConnectionSettingsBodyPipe();

  assert.deepEqual(pipe.transform({ conversationHistoryAccess: false }), {
    conversationHistoryAccess: false,
  });
});

test("Telegram connection settings parser rejects malformed external payloads", () => {
  const pipe = new ParseUpdateTelegramConnectionSettingsBodyPipe();

  assert.throws(() => pipe.transform({ conversationHistoryAccess: "yes" }), BadRequestException);
  assert.throws(() => pipe.transform({}), BadRequestException);
  assert.throws(() => pipe.transform(null), BadRequestException);
});
