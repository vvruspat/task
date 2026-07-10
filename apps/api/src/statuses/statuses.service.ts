import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateWorkspaceStatusInput,
  UpdateWorkspaceStatusInput,
} from "./statuses.contracts.js";
import { WorkspaceStatusDto } from "./statuses.dto.js";
import type { StatusesReadStore, StatusesWriteStore } from "./statuses.store.js";

@Injectable()
export class StatusesService {
  constructor(
    private readonly readStore: StatusesReadStore,
    private readonly writeStore?: StatusesWriteStore,
  ) {}

  async listStatuses(workspaceId: string, userId: string): Promise<WorkspaceStatusDto[]> {
    const statuses = await this.readStore.listForWorkspace(workspaceId, userId);

    if (statuses === null) {
      throw new NotFoundException("Workspace was not found.");
    }

    return statuses.map((status) => new WorkspaceStatusDto(status));
  }

  async createStatus(
    workspaceId: string,
    userId: string,
    input: CreateWorkspaceStatusInput,
  ): Promise<WorkspaceStatusDto> {
    return this.resolveMutation(
      this.getWriteStore().createForWorkspace(workspaceId, userId, input),
    );
  }

  async updateStatus(
    workspaceId: string,
    statusId: string,
    userId: string,
    input: UpdateWorkspaceStatusInput,
  ): Promise<WorkspaceStatusDto> {
    return this.resolveMutation(
      this.getWriteStore().updateForWorkspace(workspaceId, statusId, userId, input),
    );
  }

  async deleteStatus(
    workspaceId: string,
    statusId: string,
    userId: string,
  ): Promise<WorkspaceStatusDto> {
    return this.resolveMutation(
      this.getWriteStore().deleteForWorkspace(workspaceId, statusId, userId),
    );
  }

  private getWriteStore(): StatusesWriteStore {
    if (this.writeStore === undefined) {
      throw new NotFoundException("Workspace status was not found.");
    }
    return this.writeStore;
  }

  private async resolveMutation(
    promise: ReturnType<StatusesWriteStore["createForWorkspace"]>,
  ): Promise<WorkspaceStatusDto> {
    const result = await promise;
    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot manage statuses in this workspace.");
    }
    if (result.status === "status_not_found") {
      throw new NotFoundException("Workspace status was not found.");
    }
    if (result.status === "duplicate_name") {
      throw new ConflictException("A workspace status with this name already exists.");
    }
    if (!("workspaceStatus" in result)) {
      throw new NotFoundException("Workspace status was not found.");
    }
    return new WorkspaceStatusDto(result.workspaceStatus);
  }
}
