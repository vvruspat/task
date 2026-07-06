import { Injectable, NotFoundException } from "@nestjs/common";
import { WorkspaceDetailDto, WorkspaceMemberDto, WorkspaceSummaryDto } from "./workspaces.dto.js";
import type { WorkspaceReadStore } from "./workspaces.store.js";

@Injectable()
export class WorkspacesService {
  constructor(private readonly readStore: WorkspaceReadStore) {}

  async listWorkspaces(userId: string): Promise<WorkspaceSummaryDto[]> {
    const workspaces = await this.readStore.listForUser(userId);

    return workspaces.map((workspace) => new WorkspaceSummaryDto(workspace));
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
}
