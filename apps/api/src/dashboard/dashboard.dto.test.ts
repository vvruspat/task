import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ParseListMyTasksQueryPipe } from "./dashboard.dto.js";

const projectId = "11111111-1111-4111-8111-111111111111";
const statusId = "22222222-2222-4222-8222-222222222222";

test("ParseListMyTasksQueryPipe applies deterministic defaults and accepts every queue", () => {
  const pipe = new ParseListMyTasksQueryPipe();
  assert.deepEqual(pipe.transform({}), { page: 1, pageSize: 25 });
  for (const queue of ["today", "upcoming", "overdue", "review"]) {
    assert.deepEqual(pipe.transform({ queue, projectId, statusId, page: "2", pageSize: "100" }), {
      queue,
      projectId,
      statusId,
      page: 2,
      pageSize: 100,
    });
  }
});

test("ParseListMyTasksQueryPipe rejects invalid filters and pagination", () => {
  const pipe = new ParseListMyTasksQueryPipe();
  for (const query of [
    { queue: "later" },
    { projectId: "not-a-uuid" },
    { statusId: "not-a-uuid" },
    { page: "0" },
    { page: "1.5" },
    { pageSize: "101" },
    { pageSize: "" },
    [],
  ]) {
    assert.throws(() => pipe.transform(query), BadRequestException);
  }
});
