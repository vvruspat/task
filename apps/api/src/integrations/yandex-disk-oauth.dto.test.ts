import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  ParseCompleteYandexDiskOAuthPipe,
  ParseSelectYandexDiskFolderPipe,
  ParseSelectYandexDiskRootFolderPipe,
  ParseYandexDiskFolderTargetTypePipe,
} from "./yandex-disk-oauth.dto.js";

test("Yandex Disk OAuth callback input is bounded and runtime validated", () => {
  const pipe = new ParseCompleteYandexDiskOAuthPipe();
  const state = "a".repeat(43);
  assert.equal(pipe.transform({ code: "authorization-code", state }).code, "authorization-code");
  assert.throws(() => pipe.transform({ code: "", state }), BadRequestException);
  assert.throws(() => pipe.transform({ code: "code", state: "short" }), BadRequestException);
});

test("Yandex Disk folder paths and target types are runtime validated", () => {
  const rootPipe = new ParseSelectYandexDiskRootFolderPipe();
  const folderPipe = new ParseSelectYandexDiskFolderPipe();
  const targetPipe = new ParseYandexDiskFolderTargetTypePipe();
  assert.equal(rootPipe.transform({ path: "disk:/tAsk" }).path, "disk:/tAsk");
  assert.equal(folderPipe.transform({ path: "/Projects/Acme" }).path, "/Projects/Acme");
  assert.equal(targetPipe.transform("task"), "task");
  assert.throws(() => folderPipe.transform({ path: "relative" }), BadRequestException);
  assert.throws(() => folderPipe.transform({ path: "disk:/bad\npath" }), BadRequestException);
  assert.throws(() => targetPipe.transform("workspace"), BadRequestException);
});
