import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  UpdateWorkspaceMemberRoleInput,
} from "./workspaces.contracts.js";
import { WorkspaceDetailDto, WorkspaceMemberDto, WorkspaceSummaryDto } from "./workspaces.dto.js";
import type {
  WorkspaceManagementStore,
  WorkspaceMemberManagementStore,
  WorkspaceReadStore,
} from "./workspaces.store.js";

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly readStore: WorkspaceReadStore,
    private readonly managementStore?: WorkspaceMemberManagementStore,
    private readonly workspaceManagementStore?: WorkspaceManagementStore,
  ) {}

  async listWorkspaces(userId: string): Promise<WorkspaceSummaryDto[]> {
    const workspaces = await this.readStore.listForUser(userId);

    return workspaces.map((workspace) => new WorkspaceSummaryDto(workspace));
  }

  async createWorkspace(userId: string, input: CreateWorkspaceInput): Promise<WorkspaceDetailDto> {
    if (this.workspaceManagementStore === undefined) {
      throw new NotFoundException("Current user was not found.");
    }
    const workspace = await this.workspaceManagementStore.createWorkspace(userId, input);
    if (workspace === null) throw new NotFoundException("Current user was not found.");
    return new WorkspaceDetailDto(workspace);
  }

  async updateWorkspace(
    workspaceId: string,
    userId: string,
    input: UpdateWorkspaceInput,
  ): Promise<WorkspaceDetailDto> {
    if (this.workspaceManagementStore === undefined) {
      throw new NotFoundException("Workspace was not found.");
    }

    const result = await this.workspaceManagementStore.updateWorkspace(workspaceId, userId, input);
    if (result.status === "workspace_not_found") {
      throw new NotFoundException("Workspace was not found.");
    }
    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot update this workspace.");
    }

    if (result.status !== "updated") {
      throw new NotFoundException("Workspace was not found.");
    }

    return new WorkspaceDetailDto(result.workspace);
  }

  async deleteWorkspace(workspaceId: string, userId: string): Promise<WorkspaceSummaryDto> {
    if (this.workspaceManagementStore === undefined) {
      throw new NotFoundException("Workspace was not found.");
    }

    const result = await this.workspaceManagementStore.deleteWorkspace(workspaceId, userId);
    if (result.status === "workspace_not_found") {
      throw new NotFoundException("Workspace was not found.");
    }
    if (result.status === "forbidden") {
      throw new ForbiddenException("Only the workspace owner can delete this workspace.");
    }
    if (result.status !== "deleted") {
      throw new NotFoundException("Workspace was not found.");
    }

    return new WorkspaceSummaryDto(result.workspace);
  }

  async getWorkspace(workspaceId: string, userId: string): Promise<WorkspaceDetailDto> {
    const workspace = await this.readStore.getForUser(workspaceId, userId);

    if (workspace === null) {
      throw new NotFoundException("Workspace was not found.");
    }

    return new WorkspaceDetailDto(workspace);
  }

  async listMembers(workspaceId: string, userId: string): Promise<WorkspaceMemberDto[]> {
    const members = await this.readStore.listMembersForUser(workspaceId, userId);

    if (members === null) {
      throw new NotFoundException("Workspace was not found.");
    }

    return members.map((member) => new WorkspaceMemberDto(member));
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    userId: string,
    input: UpdateWorkspaceMemberRoleInput,
  ): Promise<WorkspaceMemberDto> {
    if (this.managementStore === undefined) {
      throw new NotFoundException("Workspace member was not found.");
    }

    const result = await this.managementStore.updateMemberRole(
      workspaceId,
      memberId,
      userId,
      input,
    );

    if (result.status === "member_not_found") {
      throw new NotFoundException("Workspace member was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot update this workspace member role.");
    }

    if (!("member" in result)) {
      throw new NotFoundException("Workspace member was not found.");
    }

    return new WorkspaceMemberDto(result.member);
  }
}
