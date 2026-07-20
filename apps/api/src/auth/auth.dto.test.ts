import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ParseLoginBodyPipe, ParseRegisterBodyPipe } from "./auth.dto.js";

test("registration input is normalized at the HTTP boundary", () => {
  assert.deepEqual(
    new ParseRegisterBodyPipe().transform({
      displayName: "  Alex   Example ",
      email: " Alex@Example.COM ",
      password: "password123",
    }),
    { displayName: "Alex Example", email: "alex@example.com", password: "password123" },
  );
});

test("login rejects malformed email and short passwords", () => {
  const pipe = new ParseLoginBodyPipe();
  assert.throws(
    () => pipe.transform({ email: "invalid", password: "password123" }),
    BadRequestException,
  );
  assert.throws(
    () => pipe.transform({ email: "a@example.com", password: "short" }),
    BadRequestException,
  );
});
