import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import type { DashboardOverview, ListMyTasksInput, MyTasksPage } from "./dashboard.contracts.js";
import { DashboardOverviewDto, MyTasksPageDto } from "./dashboard.dto.js";
import { DashboardService } from "./dashboard.service.js";
import type { DashboardReadStore } from "./dashboard.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const overview: DashboardOverview = {
  activeProjects: [],
  taskCounts: { assigned: 0, overdue: 0, dueSoon: 0 },
  recentActivity: [],
  pendingConfirmations: [],
  recentAgentRuns: [],
};
const page: MyTasksPage = { items: [], page: 2, pageSize: 10, total: 0 };
const input: ListMyTasksInput = { queue: "overdue", page: 2, pageSize: 10 };

test("DashboardService maps an empty overview to DTOs", async () => {
  const service = new DashboardService(createStore({ overview }));
  const response = await service.getOverview(workspaceId, userId);
  assert.ok(response instanceof DashboardOverviewDto);
  assert.deepEqual(response.activeProjects, []);
  assert.equal(response.taskCounts.assigned, 0);
  assert.equal(response.taskCounts.overdue, 0);
  assert.equal(response.taskCounts.dueSoon, 0);
  assert.deepEqual(response.pendingConfirmations, []);
});

test("DashboardService returns paginated queue results and preserves filters", async () => {
  let received: ListMyTasksInput | null = null;
  const service = new DashboardService(
    createStore({
      page,
      onList: (value): void => {
        received = value;
      },
    }),
  );
  const response = await service.listMyTasks(workspaceId, userId, input);
  assert.ok(response instanceof MyTasksPageDto);
  assert.equal(response.page, 2);
  assert.equal(response.pageSize, 10);
  assert.equal(response.total, 0);
  assert.deepEqual(received, input);
});

test("DashboardService hides inaccessible workspaces for overview and my tasks", async () => {
  const service = new DashboardService(createStore({ overview: null, page: null }));
  await assert.rejects(() => service.getOverview(workspaceId, userId), NotFoundException);
  await assert.rejects(() => service.listMyTasks(workspaceId, userId, input), NotFoundException);
});

function createStore(options: {
  overview?: DashboardOverview | null;
  page?: MyTasksPage | null;
  onList?: (input: ListMyTasksInput) => void;
}): DashboardReadStore {
  return {
    getOverview: async (): Promise<DashboardOverview | null> => options.overview ?? null,
    listMyTasks: async (_workspaceId, _userId, listInput): Promise<MyTasksPage | null> => {
      options.onList?.(listInput);
      return options.page ?? null;
    },
  };
}
