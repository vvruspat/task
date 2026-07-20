import assert from "node:assert/strict";
import test from "node:test";
import { parseWorkspaceRealtimeChange } from "./workspace-realtime.ts";

test("parseWorkspaceRealtimeChange validates task-scoped SSE payloads", () => {
  assert.deepEqual(
    parseWorkspaceRealtimeChange(
      JSON.stringify({
        id: "1-1",
        kind: "changed",
        workspaceId: "11111111-1111-4111-8111-111111111111",
        projectId: "22222222-2222-4222-8222-222222222222",
        taskId: "33333333-3333-4333-8333-333333333333",
        occurredAt: "2026-07-19T18:00:00.000Z",
      }),
    ),
    {
      id: "1-1",
      kind: "changed",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      projectId: "22222222-2222-4222-8222-222222222222",
      taskId: "33333333-3333-4333-8333-333333333333",
      occurredAt: "2026-07-19T18:00:00.000Z",
    },
  );
  assert.equal(parseWorkspaceRealtimeChange("{}"), null);
  assert.equal(parseWorkspaceRealtimeChange("not json"), null);
});
