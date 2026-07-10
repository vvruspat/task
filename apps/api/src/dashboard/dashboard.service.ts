import { Injectable, NotFoundException } from "@nestjs/common";
import type { ListMyTasksInput } from "./dashboard.contracts.js";
import { DashboardOverviewDto, MyTasksPageDto } from "./dashboard.dto.js";
import type { DashboardReadStore } from "./dashboard.store.js";
@Injectable()
export class DashboardService {
  constructor(private readonly store: DashboardReadStore) {}
  async getOverview(workspaceId: string, userId: string): Promise<DashboardOverviewDto> {
    const result = await this.store.getOverview(workspaceId, userId, new Date());
    if (result === null) throw new NotFoundException("Workspace was not found.");
    return new DashboardOverviewDto(result);
  }
  async listMyTasks(
    workspaceId: string,
    userId: string,
    input: ListMyTasksInput,
  ): Promise<MyTasksPageDto> {
    const result = await this.store.listMyTasks(workspaceId, userId, input, new Date());
    if (result === null) throw new NotFoundException("Workspace was not found.");
    return new MyTasksPageDto(result);
  }
}
