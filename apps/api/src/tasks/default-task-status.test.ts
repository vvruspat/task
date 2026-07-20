import assert from "node:assert/strict";
import test from "node:test";
import { selectDefaultTaskStatusId } from "./default-task-status.js";

const backlogId = "10000000-0000-4000-8000-000000000001";
const todoId = "10000000-0000-4000-8000-000000000002";
const doneId = "10000000-0000-4000-8000-000000000003";

test("selectDefaultTaskStatusId prefers Backlog over status ordering", () => {
  assert.equal(
    selectDefaultTaskStatusId([
      { id: todoId, name: "Todo", isDone: false },
      { id: backlogId, name: "Backlog", isDone: false },
      { id: doneId, name: "Done", isDone: true },
    ]),
    backlogId,
  );
});

test("selectDefaultTaskStatusId recognizes a localized backlog name", () => {
  assert.equal(
    selectDefaultTaskStatusId([{ id: backlogId, name: " Бэклог ", isDone: false }]),
    backlogId,
  );
});

test("selectDefaultTaskStatusId falls back to the first open status", () => {
  assert.equal(
    selectDefaultTaskStatusId([
      { id: doneId, name: "Done", isDone: true },
      { id: todoId, name: "Todo", isDone: false },
    ]),
    todoId,
  );
  assert.equal(selectDefaultTaskStatusId([{ id: doneId, name: "Done", isDone: true }]), doneId);
});
