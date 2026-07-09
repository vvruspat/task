import type { DashboardOverview, ListMyTasksInput, MyTasksPage } from "./dashboard.contracts.js";

export type DashboardReadStore = {
  getOverview(workspaceId: string, userId: string, now: Date): Promise<DashboardOverview | null>;
  listMyTasks(
    workspaceId: string,
    userId: string,
    input: ListMyTasksInput,
    now: Date,
  ): Promise<MyTasksPage | null>;
};
