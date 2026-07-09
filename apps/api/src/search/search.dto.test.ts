import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ParseSearchQueryPipe } from "./search.dto.js";

test("ParseSearchQueryPipe trims valid query and applies pagination defaults", () => {
  assert.deepEqual(new ParseSearchQueryPipe().transform({ query: "  launch  " }), {
    query: "launch",
    page: 1,
    pageSize: 20,
  });
});
test("ParseSearchQueryPipe rejects empty, overlong, and invalid pagination query values", () => {
  const pipe = new ParseSearchQueryPipe();
  for (const value of [
    { query: " " },
    { query: "x".repeat(201) },
    { query: "launch", page: "0" },
    { query: "launch", page: "101" },
    { query: "launch", pageSize: "101" },
  ])
    assert.throws(() => pipe.transform(value), BadRequestException);
});
