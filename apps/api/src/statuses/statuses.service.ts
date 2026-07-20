import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateWorkspaceStatusInput,
  ReorderWorkspaceStatusesInput,
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

  async listStatuses(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<WorkspaceStatusDto[]> {
    const statuses = await this.readStore.listForProject(workspaceId, projectId, userId);

    if (statuses === null) {
      throw new NotFoundException("Workspace was not found.");
    }

    return statuses.map((status) => new WorkspaceStatusDto(status));
  }

  async createStatus(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: CreateWorkspaceStatusInput,
  ): Promise<WorkspaceStatusDto> {
    return this.resolveMutation(
      this.getWriteStore().createForProject(workspaceId, projectId, userId, input),
    );
  }

  async updateStatus(
    workspaceId: string,
    projectId: string,
    statusId: string,
    userId: string,
    input: UpdateWorkspaceStatusInput,
  ): Promise<WorkspaceStatusDto> {
    return this.resolveMutation(
      this.getWriteStore().updateForProject(workspaceId, projectId, statusId, userId, input),
    );
  }

  async deleteStatus(
    workspaceId: string,
    projectId: string,
    statusId: string,
    userId: string,
  ): Promise<WorkspaceStatusDto> {
    return this.resolveMutation(
      this.getWriteStore().deleteForProject(workspaceId, projectId, statusId, userId),
    );
  }

  async reorderStatuses(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: ReorderWorkspaceStatusesInput,
  ): Promise<WorkspaceStatusDto[]> {
    const result = await this.getWriteStore().reorderForProject(
      workspaceId,
      projectId,
      userId,
      input,
    );
    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot manage statuses in this workspace.");
    }
    if (result.status === "invalid_order") {
      throw new BadRequestException("Status order must include every project status exactly once.");
    }
    if (!("workspaceStatuses" in result)) {
      throw new BadRequestException("Status order is invalid.");
    }
    return result.workspaceStatuses.map((status) => new WorkspaceStatusDto(status));
  }

  private getWriteStore(): StatusesWriteStore {
    if (this.writeStore === undefined) {
      throw new NotFoundException("Workspace status was not found.");
    }
    return this.writeStore;
  }

  private async resolveMutation(
    promise: ReturnType<StatusesWriteStore["createForProject"]>,
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
    if (result.status === "last_status") {
      throw new BadRequestException("A project must keep at least one status.");
    }
    if (result.status === "required_status") {
      throw new BadRequestException("Backlog and In progress are required project statuses.");
    }
    if (!("workspaceStatus" in result)) {
      throw new NotFoundException("Workspace status was not found.");
    }
    return new WorkspaceStatusDto(result.workspaceStatus);
  }
}
