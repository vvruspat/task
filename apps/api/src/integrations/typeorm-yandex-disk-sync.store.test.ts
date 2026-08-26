import assert from "node:assert/strict";
import test from "node:test";
import {
  isDiscoverableYandexDiskFile,
  stableYandexDiskActivityEventId,
} from "./typeorm-yandex-disk-sync.store.js";
import type { YandexDiskResource } from "./yandex-disk.client.js";

test("Yandex Disk activity IDs are stable UUIDs for polling retry deduplication", () => {
  const identity = "connection:disk:/Project/Task/brief.pdf:7:changed:task";
  const first = stableYandexDiskActivityEventId(identity);

  assert.equal(first, stableYandexDiskActivityEventId(identity));
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/u);
  assert.notEqual(first, stableYandexDiskActivityEventId(`${identity}:other`));
});

test("Yandex Disk synchronization discovers only direct files in an assigned task folder", () => {
  const file = resource();

  assert.equal(isDiscoverableYandexDiskFile(file, "disk:/Project/Task"), true);
  assert.equal(
    isDiscoverableYandexDiskFile({ ...file, parentId: "disk:/Project" }, "disk:/Project/Task"),
    false,
  );
  assert.equal(
    isDiscoverableYandexDiskFile({ ...file, resourceType: "folder" }, "disk:/Project/Task"),
    false,
  );
});

function resource(): YandexDiskResource {
  return {
    id: "disk:/Project/Task/brief.pdf",
    md5: "digest",
    mimeType: "application/pdf",
    modifiedAt: "2026-08-26T12:00:00.000Z",
    name: "brief.pdf",
    parentId: "disk:/Project/Task",
    path: "disk:/Project/Task/brief.pdf",
    resourceType: "file",
    sizeBytes: 42,
    version: "7",
    webUrl: "https://disk.yandex.ru/client/disk/Project/Task/brief.pdf",
  };
}
