import assert from "node:assert/strict";
import test from "node:test";
import { readCreatedWorkspace, readWorkspaceCreateError } from "./workspace-create.ts";

test("workspace creation boundary validates created ids and API errors", () => {
  assert.deepEqual(
    readCreatedWorkspace({
      id: "11111111-1111-4111-8111-111111111111",
      slug: "new-workspace",
    }),
    { id: "11111111-1111-4111-8111-111111111111", slug: "new-workspace" },
  );
  assert.equal(readCreatedWorkspace({ id: null, slug: "new-workspace" }), null);
  assert.equal(
    readWorkspaceCreateError({ error: "Name is required." }, "fallback"),
    "Name is required.",
  );
  assert.equal(readWorkspaceCreateError(null, "fallback"), "fallback");
});
