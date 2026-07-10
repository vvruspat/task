import assert from "node:assert/strict";
import test from "node:test";
import type { ConfirmationRequestDetail, ConfirmationRequestSummary } from "@task/api-client";
import {
  formatConfirmationPreview,
  isConfirmationActionPending,
  loadConfirmationRequests,
  resolveConfirmationRequest,
} from "./confirmationViewModels.js";

test("confirmation view model formats unknown structured previews safely", () => {
  assert.deepEqual(
    formatConfirmationPreview({
      task: { title: "Record", tags: ["today", null] },
      unknown: undefined,
    }),
    ["task: title: Record, tags: today, none", "unknown: [unavailable]"],
  );
});

test("confirmation loading reports deterministic success and errors", async () => {
  assert.deepEqual(
    await loadConfirmationRequests(api({ list: [confirmationRequest()] }), "workspace"),
    { requests: [confirmationRequest()], status: "loaded" },
  );
  assert.deepEqual(
    await loadConfirmationRequests(api({ listError: new Error("offline") }), "workspace"),
    { message: "offline", requests: [], status: "error" },
  );
});

test("confirmation resolution reports success, errors, and disables all controls while pending", async () => {
  const client = api({});
  assert.deepEqual(
    await resolveConfirmationRequest(client, {
      action: "confirm",
      confirmationRequestId: "one",
      workspaceId: "workspace",
    }),
    { confirmationRequestId: "one", status: "resolved" },
  );
  assert.deepEqual(client.calls, ["confirm:one"]);
  assert.deepEqual(
    await resolveConfirmationRequest(api({ confirmError: new Error("forbidden") }), {
      action: "confirm",
      confirmationRequestId: "one",
      workspaceId: "workspace",
    }),
    { message: "forbidden", status: "error" },
  );
  assert.equal(isConfirmationActionPending("confirming"), true);
  assert.equal(isConfirmationActionPending("cancelling"), true);
  assert.equal(isConfirmationActionPending("idle"), false);
});

function api(options: {
  confirmError?: Error;
  list?: ConfirmationRequestSummary[];
  listError?: Error;
}): {
  calls: string[];
  listPendingConfirmationRequests: (input: {
    workspaceId: string;
  }) => Promise<ConfirmationRequestSummary[]>;
  confirmConfirmationRequest: (input: {
    confirmationRequestId: string;
    workspaceId: string;
  }) => Promise<ConfirmationRequestDetail>;
  cancelConfirmationRequest: (input: {
    confirmationRequestId: string;
    workspaceId: string;
  }) => Promise<ConfirmationRequestDetail>;
} {
  const calls: string[] = [];
  return {
    calls,
    listPendingConfirmationRequests: async () => {
      if (options.listError) throw options.listError;
      return options.list ?? [];
    },
    confirmConfirmationRequest: async (input) => {
      if (options.confirmError) throw options.confirmError;
      calls.push(`confirm:${input.confirmationRequestId}`);
      return confirmationRequest(input.confirmationRequestId);
    },
    cancelConfirmationRequest: async (input) => {
      calls.push(`cancel:${input.confirmationRequestId}`);
      return confirmationRequest(input.confirmationRequestId);
    },
  };
}

function confirmationRequest(id = "one"): ConfirmationRequestSummary {
  return {
    agentRunId: "run",
    createdAt: "2026-07-10T10:00:00.000Z",
    expiresAt: "2026-07-11T10:00:00.000Z",
    id,
    kind: "task.update",
    preview: {},
    status: "pending",
    updatedAt: "2026-07-10T10:00:00.000Z",
    userId: "user",
    workspaceId: "workspace",
  };
}
