import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import type { SearchInput, SearchPage } from "./search.contracts.js";
import { SearchPageDto } from "./search.dto.js";
import { SearchService } from "./search.service.js";
import type { SearchReadStore } from "./search.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const input: SearchInput = { query: "launch", page: 1, pageSize: 20 };
const page: SearchPage = {
  items: [
    { id: workspaceId, type: "project", title: "Launch", description: null, projectId: null },
  ],
  page: 1,
  pageSize: 20,
  total: 1,
};

test("SearchService maps workspace search results to DTOs", async () => {
  let received: SearchInput | null = null;
  const service = new SearchService({
    search: async (_workspaceId, _userId, searchInput) => {
      received = searchInput;
      return page;
    },
  });
  const result = await service.search(workspaceId, userId, input);
  assert.ok(result instanceof SearchPageDto);
  assert.deepEqual(received, input);
  assert.deepEqual({ ...result.items[0] }, page.items[0]);
});
test("SearchService hides inaccessible workspaces", async () => {
  const store: SearchReadStore = { search: async () => null };
  await assert.rejects(
    () => new SearchService(store).search(workspaceId, userId, input),
    NotFoundException,
  );
});
