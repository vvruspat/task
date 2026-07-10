import assert from "node:assert/strict";
import test from "node:test";
import {
  activeTaskSearchConditions,
  applyTaskSearchFilters,
  compareSearchResults,
  getSearchCandidateLimit,
  skillRankSql,
} from "./typeorm-search-read.store.js";

const idA = "11111111-1111-4111-8111-111111111111";
const idB = "22222222-2222-4222-8222-222222222222";

test("task search query builder excludes archived projects through a tenant-scoped join", () => {
  const query = new RecordingTaskSearchQueryBuilder();
  applyTaskSearchFilters(query, { query: "launch", workspaceId: idA });
  assert.deepEqual(query.join, [
    "project",
    "project.id = task.project_id AND project.workspace_id = task.workspace_id",
  ]);
  assert.deepEqual(query.conditions, [
    "task.workspace_id = :workspaceId",
    "task.archived_at IS NULL",
    "project.archived_at IS NULL",
    "(POSITION(:query IN LOWER(task.title)) > 0 OR POSITION(:query IN LOWER(COALESCE(task.description, ''))) > 0)",
  ]);
  assert.equal(query.parameters.workspaceId, idA);
  assert.equal(activeTaskSearchConditions[2], "project.workspace_id = task.workspace_id");
});

test("skill rank treats description exact and prefix matches consistently", () => {
  assert.match(skillRankSql, /LOWER\(COALESCE\(skill\.description, ''\)\) = :query/);
  assert.match(skillRankSql, /LOWER\(COALESCE\(skill\.description, ''\)\) LIKE :query \|\| '%'/);
});

test("bounded candidate query includes every result required at the last allowed page boundary", () => {
  assert.equal(getSearchCandidateLimit({ query: "launch", page: 100, pageSize: 100 }), 10_000);
});

test("global search ranking is deterministic across pagination ties", () => {
  const matches = [
    { id: idB, type: "task" as const, title: "Launch", description: null, projectId: idA, rank: 0 },
    {
      id: idA,
      type: "project" as const,
      title: "Launch",
      description: null,
      projectId: null,
      rank: 0,
    },
    { id: idA, type: "task" as const, title: "Launch", description: null, projectId: idA, rank: 0 },
    {
      id: idA,
      type: "user" as const,
      title: "Launch",
      description: null,
      projectId: null,
      rank: 1,
    },
  ].sort(compareSearchResults);
  assert.deepEqual(
    matches.map((item) => [item.type, item.id]),
    [
      ["project", idA],
      ["task", idA],
      ["task", idB],
      ["user", idA],
    ],
  );
  assert.deepEqual(
    matches.slice(2, 4).map((item) => item.id),
    [idB, idA],
  );
});

class RecordingTaskSearchQueryBuilder {
  join: [string, string] | null = null;
  readonly conditions: string[] = [];
  parameters: { query: string; workspaceId: string } = { query: "", workspaceId: "" };
  innerJoin(_entity: unknown, alias: string, condition: string): this {
    this.join = [alias, condition];
    return this;
  }
  where(condition: string, parameters: { query: string; workspaceId: string }): this {
    this.conditions.push(condition);
    this.parameters = parameters;
    return this;
  }
  andWhere(condition: string): this {
    this.conditions.push(condition);
    return this;
  }
}
