import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  parseTrustedCurrentUserId,
  trustedCurrentUserIdHeader,
} from "./trusted-current-user.decorator.js";

const userId = "22222222-2222-4222-8222-222222222222";

test("parseTrustedCurrentUserId accepts UUID v4 user context values", () => {
  assert.equal(parseTrustedCurrentUserId(userId), userId);
});

test("parseTrustedCurrentUserId rejects missing, array, and invalid values", () => {
  assert.throws(() => parseTrustedCurrentUserId(undefined), BadRequestException);
  assert.throws(() => parseTrustedCurrentUserId([userId]), BadRequestException);
  assert.throws(() => parseTrustedCurrentUserId("not-a-uuid"), BadRequestException);
});

test("trusted current user header name is stable for OpenAPI clients", () => {
  assert.equal(trustedCurrentUserIdHeader, "x-task-user-id");
});
