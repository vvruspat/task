import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  ParseCompleteGoogleDriveOAuthPipe,
  ParseSelectGoogleDriveRootFolderPipe,
} from "./google-drive-oauth.dto.js";

test("Google Drive OAuth callback input is bounded and runtime validated", () => {
  const pipe = new ParseCompleteGoogleDriveOAuthPipe();
  const state = "a".repeat(43);

  const result = pipe.transform({ code: "authorization-code", state });

  assert.equal(result.code, "authorization-code");
  assert.equal(result.state, state);
  assert.throws(() => pipe.transform({ code: "", state }), BadRequestException);
  assert.throws(() => pipe.transform({ code: "code", state: "short" }), BadRequestException);
  assert.throws(() => pipe.transform({ code: "code", state: `${state}!` }), BadRequestException);
});

test("Google Drive root folder input accepts only bounded Drive identifiers", () => {
  const pipe = new ParseSelectGoogleDriveRootFolderPipe();

  assert.equal(pipe.transform({ folderId: "folder_Id-123" }).folderId, "folder_Id-123");
  assert.throws(() => pipe.transform({ folderId: "short" }), BadRequestException);
  assert.throws(() => pipe.transform({ folderId: "folder/id/invalid" }), BadRequestException);
});
