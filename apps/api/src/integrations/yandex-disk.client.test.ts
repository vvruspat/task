import assert from "node:assert/strict";
import test from "node:test";
import {
  buildYandexDiskWebUrl,
  joinYandexDiskPath,
  normalizeYandexDiskPath,
  parseYandexDiskFolderPage,
  parseYandexDiskResource,
  YandexDiskApiError,
  yandexDiskFolderMimeType,
} from "./yandex-disk.client.js";

test("Yandex Disk paths are canonical and traversal-safe", () => {
  assert.equal(normalizeYandexDiskPath("/Projects/Task"), "disk:/Projects/Task");
  assert.equal(joinYandexDiskPath("disk:/Projects", "Task"), "disk:/Projects/Task");
  assert.equal(
    buildYandexDiskWebUrl("disk:/Проекты/Первая задача"),
    "https://disk.yandex.ru/client/disk/%D0%9F%D1%80%D0%BE%D0%B5%D0%BA%D1%82%D1%8B/%D0%9F%D0%B5%D1%80%D0%B2%D0%B0%D1%8F%20%D0%B7%D0%B0%D0%B4%D0%B0%D1%87%D0%B0",
  );
  assert.throws(() => normalizeYandexDiskPath("disk:/Projects/../Secrets"), YandexDiskApiError);
});

test("Yandex Disk resource metadata is runtime validated", () => {
  assert.deepEqual(
    parseYandexDiskResource({
      modified: "2026-08-26T10:00:00Z",
      name: "Task",
      path: "disk:/Projects/Task",
      resource_id: "remote-id",
      revision: 12,
      type: "dir",
    }),
    {
      id: "disk:/Projects/Task",
      md5: null,
      mimeType: yandexDiskFolderMimeType,
      modifiedAt: "2026-08-26T10:00:00Z",
      name: "Task",
      parentId: "disk:/Projects",
      path: "disk:/Projects/Task",
      resourceType: "folder",
      sizeBytes: null,
      version: "12",
      webUrl: "https://disk.yandex.ru/client/disk/Projects/Task",
    },
  );
  assert.throws(
    () => parseYandexDiskResource({ name: "file", path: "disk:/file" }),
    YandexDiskApiError,
  );
});

test("Yandex Disk folder pages expose deterministic offsets", () => {
  const page = parseYandexDiskFolderPage(
    {
      _embedded: {
        items: [
          {
            md5: "abc",
            mime_type: "text/plain",
            name: "brief.txt",
            path: "disk:/Task/brief.txt",
            revision: "3",
            size: 10,
            type: "file",
          },
        ],
        total: 2,
      },
    },
    0,
    1,
  );
  assert.equal(page.items[0]?.name, "brief.txt");
  assert.equal(page.nextOffset, 1);
});
