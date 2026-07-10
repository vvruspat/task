import assert from "node:assert/strict";
import test from "node:test";
import type { SearchPage } from "@task/api-client";
import {
  buildPaletteItems,
  getNextPaletteIndex,
  getSearchResultNavigation,
  isPaletteEscapeKey,
  isWorkspaceSearchShortcut,
  type SearchResult,
  shouldAcceptSearchSettlement,
} from "./globalSearchPaletteModels.js";

const searchResult = (type: SearchResult["type"]): SearchResult => ({
  description: null,
  id: "result-id",
  projectId: "project-id",
  title: "Result",
  type,
});

test("palette includes safe navigation and creation commands", () => {
  const items = buildPaletteItems("create", null);
  assert.deepEqual(
    items.map((item) => item.kind === "command" && item.value.id),
    ["create-project", "create-task"],
  );
});

test("palette appends server search results after commands", () => {
  const page: SearchPage = { items: [searchResult("task")], page: 1, pageSize: 10, total: 1 };
  const items = buildPaletteItems("", page);
  assert.equal(items.at(-1)?.kind, "result");
});

test("palette keyboard selection wraps in both directions", () => {
  assert.equal(getNextPaletteIndex(-1, 3, "next"), 0);
  assert.equal(getNextPaletteIndex(-1, 3, "previous"), 2);
  assert.equal(getNextPaletteIndex(2, 3, "next"), 0);
  assert.equal(getNextPaletteIndex(0, 3, "previous"), 2);
  assert.equal(getNextPaletteIndex(0, 0, "next"), -1);
});

test("search result routes preserve project and task deep links", () => {
  assert.deepEqual(getSearchResultNavigation(searchResult("project")), {
    projectId: "result-id",
    routeId: "projects",
    taskId: null,
  });
  assert.deepEqual(getSearchResultNavigation(searchResult("task")), {
    projectId: "project-id",
    routeId: "table",
    taskId: "result-id",
  });
});

test("palette keyboard helpers open only Cmd or Ctrl K and close on Escape", () => {
  assert.equal(isWorkspaceSearchShortcut({ ctrlKey: false, key: "k", metaKey: true }), true);
  assert.equal(isWorkspaceSearchShortcut({ ctrlKey: true, key: "K", metaKey: false }), true);
  assert.equal(isWorkspaceSearchShortcut({ ctrlKey: false, key: "k", metaKey: false }), false);
  assert.equal(isWorkspaceSearchShortcut({ ctrlKey: true, key: "x", metaKey: false }), false);
  assert.equal(isPaletteEscapeKey("Escape"), true);
  assert.equal(isPaletteEscapeKey("Enter"), false);
});

test("search settlement ignores stale debounced requests", () => {
  assert.equal(shouldAcceptSearchSettlement(3, 3), true);
  assert.equal(shouldAcceptSearchSettlement(3, 4), false);
});
