import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type {
  ConfirmationRequestDetail,
  ConfirmationRequestSummary,
  CreateConfirmationRequestInput,
} from "./confirmations.contracts.js";
import {
  ConfirmationRequestDetailDto,
  ConfirmationRequestSummaryDto,
} from "./confirmations.dto.js";
import { ConfirmationsService } from "./confirmations.service.js";
import type {
  ConfirmationRequestCancelResult,
  ConfirmationRequestCreateResult,
  ConfirmationRequestsStore,
} from "./confirmations.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const agentRunId = "33333333-3333-4333-8333-333333333333";
const confirmationRequestId = "44444444-4444-4444-8444-444444444444";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const updatedAt = new Date("2026-01-02T00:00:00.000Z");
const expiresAt = new Date("2026-01-03T00:00:00.000Z");

const confirmationRequest: ConfirmationRequestSummary = {
  id: confirmationRequestId,
  workspaceId,
  agentRunId,
  userId,
  kind: "task_skill.apply",
  preview: {
    rootTaskTitle: "Intro",
  },
  status: "pending",
  expiresAt,
  createdAt,
  updatedAt,
};

const confirmationRequestDetail: ConfirmationRequestDetail = confirmationRequest;

const createInput: CreateConfirmationRequestInput = {
  agentRunId,
  kind: "task_skill.apply",
  preview: {
    rootTaskTitle: "Intro",
  },
  expiresAt: expiresAt.toISOString(),
};

test("ConfirmationsService maps pending confirmation requests to DTOs", async () => {
  const service = new ConfirmationsService(createStore({ requests: [confirmationRequest] }));

  const response = await service.listPendingConfirmationRequests(workspaceId, userId);

  assert.equal(response.length, 1);
  assert.ok(response[0] instanceof ConfirmationRequestSummaryDto);
  assert.equal(response[0]?.id, confirmationRequestId);
  assert.deepEqual(response[0]?.preview, confirmationRequest.preview);
});

test("ConfirmationsService returns one visible confirmation request", async () => {
  const service = new ConfirmationsService(createStore({ request: confirmationRequestDetail }));

  const response = await service.getConfirmationRequest(workspaceId, confirmationRequestId, userId);

  assert.ok(response instanceof ConfirmationRequestDetailDto);
  assert.equal(response.id, confirmationRequestId);
  assert.equal(response.status, "pending");
});

test("ConfirmationsService creates confirmation requests for writable users", async () => {
  const service = new ConfirmationsService(
    createStore({
      createResult: {
        status: "created",
        confirmationRequest: confirmationRequestDetail,
      },
    }),
  );

  const response = await service.createConfirmationRequest(workspaceId, userId, createInput);

  assert.ok(response instanceof ConfirmationRequestDetailDto);
  assert.equal(response.agentRunId, agentRunId);
  assert.equal(response.status, "pending");
});

test("ConfirmationsService cancels pending confirmation requests", async () => {
  const service = new ConfirmationsService(
    createStore({
      cancelResult: {
        status: "cancelled",
        confirmationRequest: {
          ...confirmationRequestDetail,
          status: "cancelled",
        },
      },
    }),
  );

  const response = await service.cancelConfirmationRequest(
    workspaceId,
    confirmationRequestId,
    userId,
  );

  assert.equal(response.id, confirmationRequestId);
  assert.equal(response.status, "cancelled");
});

test("ConfirmationsService hides missing workspaces and requests", async () => {
  const missingWorkspaceService = new ConfirmationsService(createStore({ requests: null }));
  const missingRequestService = new ConfirmationsService(createStore({ request: null }));

  await assert.rejects(
    () => missingWorkspaceService.listPendingConfirmationRequests(workspaceId, userId),
    NotFoundException,
  );
  await assert.rejects(
    () => missingRequestService.getConfirmationRequest(workspaceId, confirmationRequestId, userId),
    NotFoundException,
  );
});

test("ConfirmationsService maps create and cancel boundary failures", async () => {
  const forbiddenCreateService = new ConfirmationsService(
    createStore({ createResult: { status: "forbidden" } }),
  );
  const missingRunService = new ConfirmationsService(
    createStore({ createResult: { status: "agent_run_not_found" } }),
  );
  const forbiddenCancelService = new ConfirmationsService(
    createStore({ cancelResult: { status: "forbidden" } }),
  );
  const missingCancelService = new ConfirmationsService(
    createStore({ cancelResult: { status: "confirmation_request_not_found" } }),
  );

  await assert.rejects(
    () => forbiddenCreateService.createConfirmationRequest(workspaceId, userId, createInput),
    ForbiddenException,
  );
  await assert.rejects(
    () => missingRunService.createConfirmationRequest(workspaceId, userId, createInput),
    NotFoundException,
  );
  await assert.rejects(
    () =>
      forbiddenCancelService.cancelConfirmationRequest(workspaceId, confirmationRequestId, userId),
    ForbiddenException,
  );
  await assert.rejects(
    () =>
      missingCancelService.cancelConfirmationRequest(workspaceId, confirmationRequestId, userId),
    NotFoundException,
  );
});

function createStore(
  options: {
    requests?: ConfirmationRequestSummary[] | null;
    request?: ConfirmationRequestDetail | null;
    createResult?: ConfirmationRequestCreateResult;
    cancelResult?: ConfirmationRequestCancelResult;
  } = {},
): ConfirmationRequestsStore {
  return {
    listPendingForWorkspace: async (): Promise<ConfirmationRequestSummary[] | null> =>
      "requests" in options ? options.requests : [],
    getForWorkspace: async (): Promise<ConfirmationRequestDetail | null> =>
      "request" in options ? options.request : confirmationRequestDetail,
    createForWorkspace: async (): Promise<ConfirmationRequestCreateResult> =>
      options.createResult ?? {
        status: "created",
        confirmationRequest: confirmationRequestDetail,
      },
    cancelForWorkspace: async (): Promise<ConfirmationRequestCancelResult> =>
      options.cancelResult ?? {
        status: "cancelled",
        confirmationRequest: {
          ...confirmationRequestDetail,
          status: "cancelled",
        },
      },
  };
}
