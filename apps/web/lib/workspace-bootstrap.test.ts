import assert from "node:assert/strict";
import test from "node:test";
import {
  mapWithConcurrency,
  workspaceBootstrapRequestCovers,
  workspaceBootstrapRequestForRoute,
  workspaceBootstrapRequestKey,
} from "./workspace-bootstrap.ts";

test("workspace bootstrap scope follows the visible route", () => {
  assert.deepEqual(
    workspaceBootstrapRequestForRoute("/w/product/agent", { project: "album", view: null }),
    {
      includeProjectTasks: false,
      includeTaskSkills: false,
      projectSelector: null,
      scope: "shell",
      viewSelector: null,
    },
  );
  assert.deepEqual(
    workspaceBootstrapRequestForRoute("/w/product/kanban", {
      project: "album",
      view: null,
    }),
    {
      includeProjectTasks: true,
      includeTaskSkills: false,
      projectSelector: "album",
      scope: "project",
      viewSelector: null,
    },
  );
  assert.deepEqual(
    workspaceBootstrapRequestForRoute("/w/product/project/album", {
      project: null,
      view: null,
    }),
    {
      includeProjectTasks: false,
      includeTaskSkills: false,
      projectSelector: "album",
      scope: "project",
      viewSelector: null,
    },
  );
  assert.deepEqual(
    workspaceBootstrapRequestForRoute("/w/product/view/album-board", {
      project: null,
      view: null,
    }),
    {
      includeProjectTasks: true,
      includeTaskSkills: true,
      projectSelector: null,
      scope: "view",
      viewSelector: "album-board",
    },
  );
  assert.deepEqual(
    workspaceBootstrapRequestForRoute("/w/product/issue/ALB-42/song", {
      project: null,
      view: null,
    }),
    {
      includeProjectTasks: true,
      includeTaskSkills: true,
      projectSelector: "ALB",
      scope: "project",
      viewSelector: null,
    },
  );
  assert.deepEqual(
    workspaceBootstrapRequestForRoute("/w/product/templates", { project: null, view: null }),
    {
      includeProjectTasks: false,
      includeTaskSkills: true,
      projectSelector: null,
      scope: "templates",
      viewSelector: null,
    },
  );
});

test("workspace bootstrap keys separate workspace and route payloads", () => {
  assert.notEqual(
    workspaceBootstrapRequestKey("product", {
      includeProjectTasks: false,
      includeTaskSkills: false,
      projectSelector: "album",
      scope: "project",
      viewSelector: null,
    }),
    workspaceBootstrapRequestKey("product", {
      includeProjectTasks: false,
      includeTaskSkills: false,
      projectSelector: "website",
      scope: "project",
      viewSelector: null,
    }),
  );
});

test("a resolved default view payload covers its canonical slug route", () => {
  const routeData = {
    projectData: [{ projectId: "project-id" }],
    projects: [{ id: "project-id", slug: "album" }],
    views: [{ id: "view-id", slug: "album-board" }],
  };
  assert.equal(
    workspaceBootstrapRequestCovers(
      {
        includeProjectTasks: true,
        includeTaskSkills: true,
        projectSelector: null,
        scope: "view",
        viewSelector: null,
      },
      {
        includeProjectTasks: true,
        includeTaskSkills: true,
        projectSelector: null,
        scope: "view",
        viewSelector: "album-board",
      },
      routeData,
    ),
    true,
  );
  assert.equal(
    workspaceBootstrapRequestCovers(
      {
        includeProjectTasks: false,
        includeTaskSkills: false,
        projectSelector: null,
        scope: "shell",
        viewSelector: null,
      },
      {
        includeProjectTasks: false,
        includeTaskSkills: false,
        projectSelector: "album",
        scope: "project",
        viewSelector: null,
      },
      routeData,
    ),
    false,
  );
  assert.equal(
    workspaceBootstrapRequestCovers(
      {
        includeProjectTasks: false,
        includeTaskSkills: false,
        projectSelector: "album",
        scope: "project",
        viewSelector: null,
      },
      {
        includeProjectTasks: true,
        includeTaskSkills: false,
        projectSelector: "album",
        scope: "project",
        viewSelector: null,
      },
      routeData,
    ),
    false,
  );
});

test("mapWithConcurrency bounds work and preserves input order", async () => {
  let active = 0;
  let maximumActive = 0;
  const releases: Array<() => void> = [];
  const promise = mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise<void>((resolve) => releases.push(resolve));
    active -= 1;
    return value * 10;
  });

  await waitFor(() => releases.length === 2);
  releases.shift()?.();
  releases.shift()?.();
  await waitFor(() => releases.length === 2);
  releases.shift()?.();
  releases.shift()?.();
  await waitFor(() => releases.length === 1);
  releases.shift()?.();

  assert.deepEqual(await promise, [10, 20, 30, 40, 50]);
  assert.equal(maximumActive, 2);
});

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error("Timed out waiting for bounded workspace work.");
}
