import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceNavigationUrl, parseWorkspaceNavigation } from "./navigation.js";

test("parseWorkspaceNavigation accepts known routes and preserves project deep links", () => {
  assert.deepEqual(parseWorkspaceNavigation("?view=kanban&project=project-42"), {
    projectId: "project-42",
    routeId: "kanban",
  });
});

test("parseWorkspaceNavigation falls back safely for unknown routes", () => {
  assert.deepEqual(parseWorkspaceNavigation("?view=unknown"), {
    projectId: null,
    routeId: "dashboard",
  });
});

test("createWorkspaceNavigationUrl replaces navigation state without dropping other query values", () => {
  assert.equal(
    createWorkspaceNavigationUrl(
      { hash: "#activity", pathname: "/workspace", search: "?filter=open&project=old" },
      { projectId: "project-42", routeId: "confirmations" },
    ),
    "/workspace?filter=open&project=project-42&view=confirmations#activity",
  );
});
