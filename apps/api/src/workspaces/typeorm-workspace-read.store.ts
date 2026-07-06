import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, In } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { WorkspaceDetail, WorkspaceMember, WorkspaceSummary } from "./workspaces.contracts.js";
import type { WorkspaceReadStore } from "./workspaces.store.js";

@Injectable()
export class TypeOrmWorkspaceReadStore implements WorkspaceReadStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listForUser(userId: string): Promise<WorkspaceSummary[]> {
    const dataSource = await this.getInitializedDataSource();
    const memberships = await dataSource.getRepository(WorkspaceMemberEntity).find({
      where: { userId },
      order: { createdAt: "ASC" },
    });
    const workspaceIds = memberships.map((membership) => membership.workspaceId);

    if (workspaceIds.length === 0) {
      return [];
    }

    const workspaces = await dataSource.getRepository(WorkspaceEntity).findBy({
      id: In(workspaceIds),
    });
    const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

    return memberships.flatMap((membership) => {
      const workspace = workspaceById.get(membership.workspaceId);

      if (workspace === undefined) {
        return [];
      }

      return [toWorkspaceSummary(workspace)];
    });
  }

  async getForUser(workspaceId: string, userId: string): Promise<WorkspaceDetail | null> {
    const workspace = await this.findWorkspaceForMember(workspaceId, userId);

    if (workspace === null) {
      return null;
    }

    const members = await this.listMembersForWorkspace(workspaceId);

    return {
      ...toWorkspaceSummary(workspace),
      members,
    };
  }

  async listMembersForUser(workspaceId: string, userId: string): Promise<WorkspaceMember[] | null> {
    const workspace = await this.findWorkspaceForMember(workspaceId, userId);

    if (workspace === null) {
      return null;
    }

    return this.listMembersForWorkspace(workspaceId);
  }

  private async findWorkspaceForMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceEntity | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return null;
    }

    return dataSource.getRepository(WorkspaceEntity).findOneBy({ id: workspaceId });
  }

  private async listMembersForWorkspace(workspaceId: string): Promise<WorkspaceMember[]> {
    const dataSource = await this.getInitializedDataSource();
    const memberRepository = dataSource.getRepository(WorkspaceMemberEntity);
    const userRepository = dataSource.getRepository(UserEntity);
    const members = await memberRepository.find({
      where: { workspaceId },
      order: { createdAt: "ASC" },
    });
    const userIds = members.map((member) => member.userId);

    if (userIds.length === 0) {
      return [];
    }

    const users = await userRepository.findBy({ id: In(userIds) });
    const userById = new Map(users.map((user) => [user.id, user]));

    return members.flatMap((member) => {
      const user = userById.get(member.userId);

      if (user === undefined) {
        return [];
      }

      return [toWorkspaceMember(member, user)];
    });
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();

    if (dataSource === null) {
      throw new ServiceUnavailableException("Database is not configured.");
    }

    if (dataSource.isInitialized) {
      return dataSource;
    }

    this.initialization ??= dataSource.initialize();

    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

function toWorkspaceSummary(workspace: WorkspaceEntity): WorkspaceSummary {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

function toWorkspaceMember(member: WorkspaceMemberEntity, user: UserEntity): WorkspaceMember {
  return {
    id: member.id,
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}
