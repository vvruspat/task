import assert from "node:assert/strict";
import test from "node:test";
import {
  buildYandexDiskCollisionFolderName,
  buildYandexDiskProjectFolderName,
  buildYandexDiskTaskFolderName,
} from "./yandex-disk-task-folder.service.js";

test("Yandex Disk project and task folders use provider-safe entity names", () => {
  assert.equal(buildYandexDiskProjectFolderName("  Acme / Launch  "), "Acme Launch");
  assert.equal(buildYandexDiskTaskFolderName("Spec:*?<>|"), "Spec");
  assert.equal(buildYandexDiskTaskFolderName("\u0000/"), "Task");
});

test("Yandex Disk folder names stay within the provider-safe bound", () => {
  assert.equal(Array.from(buildYandexDiskTaskFolderName("я".repeat(300))).length, 240);
  assert.equal(
    buildYandexDiskCollisionFolderName("Spec", "12345678-1234-4234-8234-123456789012"),
    "Spec [tAsk-12345678]",
  );
  assert.equal(
    buildYandexDiskCollisionFolderName("a".repeat(300), "12345678-1234-4234-8234-123456789012")
      .length,
    240,
  );
});
