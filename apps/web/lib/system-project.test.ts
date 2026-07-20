import assert from "node:assert/strict";
import test from "node:test";
import type { ProjectSummary } from "@task/api-client";
import { isUnprojectedIssueProject, unprojectedIssueProjectStatus } from "./system-project.ts";

function project(status: string): ProjectSummary {
  return {
    createdAt: "2026-07-20T00:00:00.000Z",
    createdByUserId: "user-id",
    id: "project-id",
    key: "ISS",
    slug: "issues",
    status,
    title: "Issues",
    updatedAt: "2026-07-20T00:00:00.000Z",
    workspaceId: "workspace-id",
  };
}

test("recognizes only the hidden project used by projectless issues", () => {
  assert.equal(isUnprojectedIssueProject(project(unprojectedIssueProjectStatus)), true);
  assert.equal(isUnprojectedIssueProject(project("active")), false);
});
