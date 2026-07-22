import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalWorkspaceRoute,
  resolveWorkspaceRouteProject,
  workspacePageHref,
  workspaceProjectHref,
} from "./workspace-url.ts";

const projects = [
  { id: "project-one-id", key: "ONE", slug: "project-one" },
  { id: "project-two-id", key: "TWO", slug: "project-two" },
] as const;
const views = [
  { id: "view-one-id", projectId: "project-one-id", slug: "project-one-board" },
] as const;
const data = { projects, views, workspace: { id: "workspace-id", slug: "product" } };

test("workspace page URLs encode workspace and project identity", () => {
  assert.equal(
    workspacePageHref("product studio", "agent", { projectSlug: "album release" }),
    "/w/product%20studio/agent?project=album+release",
  );
  assert.equal(
    workspaceProjectHref("product studio", "album release"),
    "/w/product%20studio/project/album%20release",
  );
});

test("canonical routes ignore persisted project state and resolve URL state", () => {
  assert.equal(
    resolveWorkspaceRouteProject("/w/product/agent", null, "project-two-id", projects, views),
    undefined,
  );
  assert.equal(
    resolveWorkspaceRouteProject(
      "/w/product/agent",
      "project-one",
      "project-two-id",
      projects,
      views,
    )?.id,
    "project-one-id",
  );
  assert.equal(
    resolveWorkspaceRouteProject(
      "/w/product/view/project-one-board",
      null,
      "project-two-id",
      projects,
      views,
    )?.id,
    "project-one-id",
  );
});

test("legacy and id-based links migrate to canonical slug routes", () => {
  assert.equal(
    canonicalWorkspaceRoute(
      "/agent",
      { project: null, skill: null, view: null },
      data,
      "project-two-id",
    ),
    "/w/product/agent?project=project-two",
  );
  assert.equal(
    canonicalWorkspaceRoute(
      "/w/product/agent",
      { project: "project-one-id", skill: null, view: null },
      data,
      null,
    ),
    "/w/product/agent?project=project-one",
  );
  assert.equal(
    canonicalWorkspaceRoute(
      "/projects/project-one-id",
      { project: null, skill: null, view: null },
      data,
      null,
    ),
    "/w/product/project/project-one",
  );
  assert.equal(
    canonicalWorkspaceRoute(
      "/views",
      { project: null, skill: null, view: "view-one-id" },
      data,
      null,
    ),
    "/w/product/view/project-one-board",
  );
});

test("refresh and history preserve an already canonical route", () => {
  const resolve = (project: string, storedProjectId: string): string | null =>
    canonicalWorkspaceRoute(
      "/w/product/agent",
      { project, skill: null, view: null },
      data,
      storedProjectId,
    );
  assert.equal(resolve("project-one", "project-two-id"), null);
  assert.equal(resolve("project-one", "project-one-id"), null);
  assert.equal(resolve("project-two", "project-one-id"), null);
});

test("background workspace switching cannot rewrite the requested workspace", () => {
  assert.equal(
    canonicalWorkspaceRoute(
      "/w/another-workspace/agent",
      { project: null, skill: null, view: null },
      data,
      null,
    ),
    null,
  );
  assert.equal(
    canonicalWorkspaceRoute(
      "/w/workspace-id/agent",
      { project: null, skill: null, view: null },
      data,
      null,
    ),
    "/w/product/agent",
  );
});
