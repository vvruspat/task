import { Injectable, NotFoundException } from "@nestjs/common";
import { WorkspaceStatusDto } from "./statuses.dto.js";
import type { StatusesReadStore } from "./statuses.store.js";

@Injectable()
export class StatusesService {
  constructor(private readonly readStore: StatusesReadStore) {}

  async listStatuses(workspaceId: string, userId: string): Promise<WorkspaceStatusDto[]> {
    const statuses = await this.readStore.listForWorkspace(workspaceId, userId);

    if (statuses === null) {
      throw new NotFoundException("Workspace was not found.");
    }

    return statuses.map((status) => new WorkspaceStatusDto(status));
  }
}
