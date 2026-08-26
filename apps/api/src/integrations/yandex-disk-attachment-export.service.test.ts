import assert from "node:assert/strict";
import test from "node:test";
import { buildYandexDiskAttachmentFileName } from "./yandex-disk-attachment-export.service.js";

test("Yandex Disk export names remain recognizable and collision-safe", () => {
  assert.equal(
    buildYandexDiskAttachmentFileName("brief.pdf", "12345678-1234-4234-8234-123456789012"),
    "brief [tAsk-12345678].pdf",
  );
  assert.ok(
    buildYandexDiskAttachmentFileName(
      `${"a".repeat(300)}.txt`,
      "12345678-1234-4234-8234-123456789012",
    ).length <= 240,
  );
  assert.equal(
    buildYandexDiskAttachmentFileName(
      'design:final?<>|".png',
      "12345678-1234-4234-8234-123456789012",
    ),
    "design final [tAsk-12345678].png",
  );
});
