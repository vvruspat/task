import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import type {
  ConfirmationRequestDetail,
  ConfirmationRequestSummary,
  CreateConfirmationRequestInput,
} from "./confirmations.contracts.js";
import { ConfirmationsController } from "./confirmations.controller.js";
import { ParseCreateConfirmationRequestBodyPipe } from "./confirmations.dto.js";
import { ConfirmationsService } from "./confirmations.service.js";
import type {
  ConfirmationRequestCancelResult,
  ConfirmationRequestConfirmResult,
  ConfirmationRequestCreateResult,
  ConfirmationRequestsStore,
} from "./confirmations.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const agentRunId = "33333333-3333-4333-8333-333333333333";
const confirmationRequestId = "44444444-4444-4444-8444-444444444444";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const expiresAt = new Date("2026-01-03T00:00:00.000Z");

const confirmationRequest: ConfirmationRequestDetail = {
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
  updatedAt: createdAt,
};

const createInput: CreateConfirmationRequestInput = {
  agentRunId,
  kind: "task_skill.apply",
  preview: {
    rootTaskTitle: "Intro",
  },
  expiresAt: expiresAt.toISOString(),
};

test("ConfirmationsController uses trusted current user context for list reads", async () => {
  const calls: Array<{ workspaceId: string; userId: string }> = [];
  const controller = new ConfirmationsController(
    new ConfirmationsService(
      createStore({
        calls,
        requests: [confirmationRequest],
      }),
    ),
  );

  const response = await controller.listPendingConfirmationRequests(workspaceId, userId);

  assert.equal(response.length, 1);
  assert.equal(response[0]?.id, confirmationRequestId);
  assert.deepEqual(calls, [{ workspaceId, userId }]);
});

test("ConfirmationsController uses trusted current user context for detail reads", async () => {
  const calls: Array<{ workspaceId: string; confirmationRequestId: string; userId: string }> = [];
  const controller = new ConfirmationsController(
    new ConfirmationsService(
      createStore({
        detailCalls: calls,
        request: confirmationRequest,
      }),
    ),
  );

  const response = await controller.getConfirmationRequest(
    workspaceId,
    confirmationRequestId,
    userId,
  );

  assert.equal(response.id, confirmationRequestId);
  assert.deepEqual(calls, [{ workspaceId, confirmationRequestId, userId }]);
});

test("ConfirmationsController uses trusted current user context for creates", async () => {
  const calls: Array<{
    workspaceId: string;
    userId: string;
    input: CreateConfirmationRequestInput;
  }> = [];
  const controller = new ConfirmationsController(
    new ConfirmationsService(
      createStore({
        createCalls: calls,
        createResult: {
          status: "created",
          confirmationRequest,
        },
      }),
    ),
  );

  const response = await controller.createConfirmationRequest(workspaceId, userId, createInput);

  assert.equal(response.id, confirmationRequestId);
  assert.deepEqual(calls, [{ workspaceId, userId, input: createInput }]);
});

test("ConfirmationsController uses trusted current user context for cancels", async () => {
  const calls: Array<{ workspaceId: string; confirmationRequestId: string; userId: string }> = [];
  const controller = new ConfirmationsController(
    new ConfirmationsService(
      createStore({
        cancelCalls: calls,
        cancelResult: {
          status: "cancelled",
          confirmationRequest: {
            ...confirmationRequest,
            status: "cancelled",
          },
        },
      }),
    ),
  );

  const response = await controller.cancelConfirmationRequest(
    workspaceId,
    confirmationRequestId,
    userId,
  );

  assert.equal(response.status, "cancelled");
  assert.deepEqual(calls, [{ workspaceId, confirmationRequestId, userId }]);
});

test("ConfirmationsController uses trusted current user context for confirms", async () => {
  const calls: Array<{ workspaceId: string; confirmationRequestId: string; userId: string }> = [];
  const controller = new ConfirmationsController(
    new ConfirmationsService(
      createStore({
        confirmCalls: calls,
        confirmResult: {
          status: "confirmed",
          confirmationRequest: {
            ...confirmationRequest,
            status: "confirmed",
          },
        },
      }),
    ),
  );

  const response = await controller.confirmConfirmationRequest(
    workspaceId,
    confirmationRequestId,
    userId,
  );

  assert.equal(response.status, "confirmed");
  assert.deepEqual(calls, [{ workspaceId, confirmationRequestId, userId }]);
});

test("ParseCreateConfirmationRequestBodyPipe validates and normalizes payloads", () => {
  const pipe = new ParseCreateConfirmationRequestBodyPipe();

  assert.deepEqual(
    pipe.transform({
      agentRunId,
      kind: " task_skill.apply ",
      preview: {
        rootTaskTitle: "Intro",
      },
      expiresAt: "2026-01-03T00:00:00Z",
    }),
    createInput,
  );
  assert.throws(() => pipe.transform(null), BadRequestException);
  assert.throws(
    () => pipe.transform({ agentRunId, kind: "", preview: {}, expiresAt: expiresAt.toISOString() }),
    BadRequestException,
  );
  assert.throws(
    () =>
      pipe.transform({ agentRunId, kind: "x", preview: [], expiresAt: expiresAt.toISOString() }),
    BadRequestException,
  );
  assert.throws(
    () => pipe.transform({ agentRunId, kind: "x", preview: {}, expiresAt: "tomorrow" }),
    BadRequestException,
  );
});

function createStore(
  options: {
    calls?: Array<{ workspaceId: string; userId: string }>;
    detailCalls?: Array<{ workspaceId: string; confirmationRequestId: string; userId: string }>;
    createCalls?: Array<{
      workspaceId: string;
      userId: string;
      input: CreateConfirmationRequestInput;
    }>;
    cancelCalls?: Array<{ workspaceId: string; confirmationRequestId: string; userId: string }>;
    confirmCalls?: Array<{ workspaceId: string; confirmationRequestId: string; userId: string }>;
    requests?: ConfirmationRequestSummary[] | null;
    request?: ConfirmationRequestDetail | null;
    createResult?: ConfirmationRequestCreateResult;
    cancelResult?: ConfirmationRequestCancelResult;
    confirmResult?: ConfirmationRequestConfirmResult;
  } = {},
): ConfirmationRequestsStore {
  return {
    listPendingForWorkspace: async (
      requestWorkspaceId,
      requestUserId,
    ): Promise<ConfirmationRequestSummary[] | null> => {
      options.calls?.push({ workspaceId: requestWorkspaceId, userId: requestUserId });

      return options.requests ?? [];
    },
    getForWorkspace: async (
      requestWorkspaceId,
      requestConfirmationRequestId,
      requestUserId,
    ): Promise<ConfirmationRequestDetail | null> => {
      options.detailCalls?.push({
        workspaceId: requestWorkspaceId,
        confirmationRequestId: requestConfirmationRequestId,
        userId: requestUserId,
      });

      return options.request ?? confirmationRequest;
    },
    createForWorkspace: async (
      requestWorkspaceId,
      requestUserId,
      input,
    ): Promise<ConfirmationRequestCreateResult> => {
      options.createCalls?.push({
        workspaceId: requestWorkspaceId,
        userId: requestUserId,
        input,
      });

      return (
        options.createResult ?? {
          status: "created",
          confirmationRequest,
        }
      );
    },
    cancelForWorkspace: async (
      requestWorkspaceId,
      requestConfirmationRequestId,
      requestUserId,
    ): Promise<ConfirmationRequestCancelResult> => {
      options.cancelCalls?.push({
        workspaceId: requestWorkspaceId,
        confirmationRequestId: requestConfirmationRequestId,
        userId: requestUserId,
      });

      return (
        options.cancelResult ?? {
          status: "cancelled",
          confirmationRequest: {
            ...confirmationRequest,
            status: "cancelled",
          },
        }
      );
    },
    confirmForWorkspace: async (
      requestWorkspaceId,
      requestConfirmationRequestId,
      requestUserId,
    ): Promise<ConfirmationRequestConfirmResult> => {
      options.confirmCalls?.push({
        workspaceId: requestWorkspaceId,
        confirmationRequestId: requestConfirmationRequestId,
        userId: requestUserId,
      });

      return (
        options.confirmResult ?? {
          status: "confirmed",
          confirmationRequest: {
            ...confirmationRequest,
            status: "confirmed",
          },
        }
      );
    },
  };
}
