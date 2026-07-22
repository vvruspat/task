import assert from "node:assert/strict";
import test from "node:test";
import { parsePersistedWorkspaceSelection } from "./workspace-selection-store.ts";

test("persisted workspace selection accepts only a nullable workspace id", () => {
  assert.deepEqual(parsePersistedWorkspaceSelection({ selectedWorkspaceId: "workspace-id" }), {
    selectedWorkspaceId: "workspace-id",
  });
  assert.deepEqual(parsePersistedWorkspaceSelection({ selectedWorkspaceId: null }), {
    selectedWorkspaceId: null,
  });
  assert.deepEqual(
    parsePersistedWorkspaceSelection({
      selectedProjectId: "legacy-project-id",
      selectedWorkspaceId: 42,
    }),
    { selectedWorkspaceId: null },
  );
});
