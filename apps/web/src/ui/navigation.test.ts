import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceNavigationUrl, parseWorkspaceNavigation } from "./navigation.js";

test("parseWorkspaceNavigation accepts known routes and preserves project deep links", () => {
  assert.deepEqual(parseWorkspaceNavigation("?view=kanban&project=project-42"), {
    projectId: "project-42",
    routeId: "kanban",
    taskId: null,
  });
});

test("parseWorkspaceNavigation falls back safely for unknown routes", () => {
  assert.deepEqual(parseWorkspaceNavigation("?view=unknown"), {
    projectId: null,
    routeId: "dashboard",
    taskId: null,
  });
});

test("createWorkspaceNavigationUrl replaces navigation state without dropping other query values", () => {
  assert.equal(
    createWorkspaceNavigationUrl(
      { hash: "#activity", pathname: "/workspace", search: "?filter=open&project=old" },
      { projectId: "project-42", routeId: "confirmations", taskId: "task-7" },
    ),
    "/workspace?filter=open&project=project-42&view=confirmations&task=task-7#activity",
  );
});

test("cancelled popstate can restore the previous task drawer URL", () => {
  assert.equal(
    createWorkspaceNavigationUrl(
      { hash: "", pathname: "/workspace", search: "?view=table&project=project-1" },
      { projectId: "project-1", routeId: "kanban", taskId: "task-1" },
    ),
    "/workspace?view=kanban&project=project-1&task=task-1",
  );
});
