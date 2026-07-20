import assert from "node:assert/strict";
import test from "node:test";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateWorkspaceStatusInput,
  UpdateWorkspaceStatusInput,
  WorkspaceStatus,
} from "./statuses.contracts.js";
import {
  ParseReorderWorkspaceStatusesBodyPipe,
  ParseUpdateWorkspaceStatusBodyPipe,
  WorkspaceStatusDto,
} from "./statuses.dto.js";
import { StatusesService } from "./statuses.service.js";
import type { StatusesReadStore, StatusesWriteStore } from "./statuses.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const projectId = "44444444-4444-4444-8444-444444444444";
const statusId = "33333333-3333-4333-8333-333333333333";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const updatedAt = new Date("2026-01-02T00:00:00.000Z");

const workspaceStatus: WorkspaceStatus = {
  id: statusId,
  workspaceId,
  projectId,
  name: "In progress",
  color: "#3b82f6",
  position: "1000",
  isDone: false,
  createdAt,
  updatedAt,
};

test("StatusesService maps visible workspace statuses to DTOs", async () => {
  const service = new StatusesService(createReadStore({ statuses: [workspaceStatus] }));

  const response = await service.listStatuses(workspaceId, projectId, userId);

  assert.equal(response.length, 1);
  assert.ok(response[0] instanceof WorkspaceStatusDto);
  assert.equal(response[0]?.id, workspaceStatus.id);
  assert.equal(response[0]?.workspaceId, workspaceStatus.workspaceId);
  assert.equal(response[0]?.name, workspaceStatus.name);
  assert.equal(response[0]?.color, workspaceStatus.color);
  assert.equal(response[0]?.position, workspaceStatus.position);
  assert.equal(response[0]?.isDone, workspaceStatus.isDone);
});

test("StatusesService hides missing or inaccessible workspaces", async () => {
  const service = new StatusesService(createReadStore({ statuses: null }));

  await assert.rejects(
    () => service.listStatuses(workspaceId, projectId, userId),
    NotFoundException,
  );
});

test("StatusesService permits typed status mutations and surfaces permission errors", async () => {
  const service = new StatusesService(createReadStore({}), createWriteStore({ workspaceStatus }));
  const created = await service.createStatus(workspaceId, projectId, userId, {
    color: "#3b82f6",
    name: "In progress",
    position: "1000",
  });
  assert.equal(created.id, statusId);
  const updated = await service.updateStatus(workspaceId, projectId, statusId, userId, {
    isDone: true,
  });
  assert.equal(updated.id, statusId);

  const forbiddenService = new StatusesService(
    createReadStore({}),
    createWriteStore({ result: "forbidden" }),
  );
  await assert.rejects(
    () =>
      forbiddenService.createStatus(workspaceId, projectId, userId, {
        color: "#3b82f6",
        name: "Done",
        position: "2000",
      }),
    ForbiddenException,
  );

  const duplicateService = new StatusesService(
    createReadStore({}),
    createWriteStore({ result: "duplicate_name" }),
  );
  await assert.rejects(
    () =>
      duplicateService.createStatus(workspaceId, projectId, userId, {
        color: "#3b82f6",
        name: "Done",
        position: "2000",
      }),
    ConflictException,
  );
});

test("ParseUpdateWorkspaceStatusBodyPipe rejects an empty status update", () => {
  assert.throws(() => new ParseUpdateWorkspaceStatusBodyPipe().transform({}), /at least one field/);
});

test("ParseUpdateWorkspaceStatusBodyPipe accepts only six-digit hex colors", () => {
  const pipe = new ParseUpdateWorkspaceStatusBodyPipe();

  assert.deepEqual(pipe.transform({ color: "#3b82f6" }), { color: "#3b82f6" });
  assert.throws(() => pipe.transform({ color: "blue" }), /six-digit hex color/);
});

test("StatusesService atomically reorders all project statuses", async () => {
  const service = new StatusesService(createReadStore({}), createWriteStore({ workspaceStatus }));
  const statuses = await service.reorderStatuses(workspaceId, projectId, userId, {
    statusIds: [statusId],
  });
  assert.equal(statuses[0]?.id, statusId);

  const invalidService = new StatusesService(
    createReadStore({}),
    createWriteStore({ reorderResult: "invalid_order" }),
  );
  await assert.rejects(
    () => invalidService.reorderStatuses(workspaceId, projectId, userId, { statusIds: [statusId] }),
    BadRequestException,
  );
});

test("ParseReorderWorkspaceStatusesBodyPipe requires unique UUIDs", () => {
  const pipe = new ParseReorderWorkspaceStatusesBodyPipe();
  assert.deepEqual(pipe.transform({ statusIds: [statusId] }), { statusIds: [statusId] });
  assert.throws(() => pipe.transform({ statusIds: [statusId, statusId] }), BadRequestException);
});

function createReadStore(options: { statuses?: WorkspaceStatus[] | null }): StatusesReadStore {
  return {
    listForProject: async (): Promise<WorkspaceStatus[] | null> => options.statuses ?? null,
  };
}

function createWriteStore(options: {
  result?: "duplicate_name" | "forbidden" | "status_not_found";
  reorderResult?: "forbidden" | "invalid_order";
  workspaceStatus?: WorkspaceStatus;
}): StatusesWriteStore {
  const result = ():
    | { status: "duplicate_name" | "forbidden" | "status_not_found" }
    | {
        status: "created" | "updated";
        workspaceStatus: WorkspaceStatus;
      } => {
    if (options.result !== undefined) return { status: options.result };
    if (options.workspaceStatus === undefined) return { status: "status_not_found" };
    return { status: "updated", workspaceStatus: options.workspaceStatus };
  };
  return {
    createForProject: async (
      _workspaceId: string,
      _projectId: string,
      _userId: string,
      _input: CreateWorkspaceStatusInput,
    ) => result(),
    updateForProject: async (
      _workspaceId: string,
      _projectId: string,
      _statusId: string,
      _userId: string,
      _input: UpdateWorkspaceStatusInput,
    ) => result(),
    deleteForProject: async () => result(),
    reorderForProject: async () =>
      options.reorderResult === undefined && options.workspaceStatus !== undefined
        ? { status: "reordered", workspaceStatuses: [options.workspaceStatus] }
        : { status: options.reorderResult ?? "invalid_order" },
  };
}
