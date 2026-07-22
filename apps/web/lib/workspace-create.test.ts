import assert from "node:assert/strict";
import test from "node:test";
import { readCreatedWorkspaceId, readWorkspaceCreateError } from "./workspace-create.ts";

test("workspace creation boundary validates created ids and API errors", () => {
  assert.equal(
    readCreatedWorkspaceId({ id: "11111111-1111-4111-8111-111111111111" }),
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(readCreatedWorkspaceId({ id: null }), null);
  assert.equal(
    readWorkspaceCreateError({ error: "Name is required." }, "fallback"),
    "Name is required.",
  );
  assert.equal(readWorkspaceCreateError(null, "fallback"), "fallback");
});
