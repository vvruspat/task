import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, In } from "typeorm";
import { selectAvailableWorkspaceScopedSlug } from "../common/workspace-slug.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  UpdateWorkspaceMemberRoleInput,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceSummary,
} from "./workspaces.contracts.js";
import type {
  WorkspaceDeleteResult,
  WorkspaceManagementStore,
  WorkspaceMemberManagementStore,
  WorkspaceMemberRoleUpdateResult,
  WorkspaceReadStore,
} from "./workspaces.store.js";

const memberRoleManagers = new Set(["owner", "admin"]);

@Injectable()
export class TypeOrmWorkspaceReadStore
  implements WorkspaceReadStore, WorkspaceMemberManagementStore, WorkspaceManagementStore
{
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async createWorkspace(
    userId: string,
    input: CreateWorkspaceInput,
  ): Promise<WorkspaceDetail | null> {
    const dataSource = await this.getInitializedDataSource();
    return dataSource.transaction(async (manager): Promise<WorkspaceDetail | null> => {
      const user = await manager.getRepository(UserEntity).findOneBy({ id: userId });
      if (user === null) return null;
      const existing = await manager
        .getRepository(WorkspaceEntity)
        .find({ select: { slug: true } });
      const workspace = await manager.getRepository(WorkspaceEntity).save(
        manager.getRepository(WorkspaceEntity).create({
          name: input.name,
          slug: selectAvailableWorkspaceScopedSlug(
            input.name,
            new Set(existing.map((item) => item.slug)),
          ),
        }),
      );
      const member = await manager.getRepository(WorkspaceMemberEntity).save(
        manager.getRepository(WorkspaceMemberEntity).create({
          role: "owner",
          userId,
          workspaceId: workspace.id,
        }),
      );
      return {
        ...toWorkspaceSummary(workspace),
        description: workspace.description,
        members: [toWorkspaceMember(member, user)],
      };
    });
  }

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

  async deleteWorkspace(workspaceId: string, userId: string): Promise<WorkspaceDeleteResult> {
    const dataSource = await this.getInitializedDataSource();
    return dataSource.transaction(async (manager): Promise<WorkspaceDeleteResult> => {
      const workspaceRepository = manager.getRepository(WorkspaceEntity);
      const workspace = await workspaceRepository.findOneBy({ id: workspaceId });
      if (workspace === null) return { status: "workspace_not_found" };

      const membership = await manager.getRepository(WorkspaceMemberEntity).findOneBy({
        workspaceId,
        userId,
      });
      if (membership?.role !== "owner") return { status: "forbidden" };

      const summary = toWorkspaceSummary(workspace);
      await workspaceRepository.remove(workspace);
      return { status: "deleted", workspace: summary };
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
      description: workspace.description,
      members,
    };
  }

  async updateWorkspace(
    workspaceId: string,
    userId: string,
    input: UpdateWorkspaceInput,
  ): Promise<import("./workspaces.store.js").WorkspaceUpdateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null || !memberRoleManagers.has(membership.role)) {
      return { status: "forbidden" };
    }

    const repository = dataSource.getRepository(WorkspaceEntity);
    const workspace = await repository.findOneBy({ id: workspaceId });
    if (workspace === null) return { status: "workspace_not_found" };

    if (input.name !== undefined) workspace.name = input.name;
    if (input.description !== undefined) workspace.description = input.description;
    await repository.save(workspace);

    return {
      status: "updated",
      workspace: {
        ...toWorkspaceSummary(workspace),
        description: workspace.description,
        members: await this.listMembersForWorkspace(workspaceId),
      },
    };
  }

  async listMembersForUser(workspaceId: string, userId: string): Promise<WorkspaceMember[] | null> {
    const workspace = await this.findWorkspaceForMember(workspaceId, userId);

    if (workspace === null) {
      return null;
    }

    return this.listMembersForWorkspace(workspaceId);
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    userId: string,
    input: UpdateWorkspaceMemberRoleInput,
  ): Promise<WorkspaceMemberRoleUpdateResult> {
    const dataSource = await this.getInitializedDataSource();
    const memberRepository = dataSource.getRepository(WorkspaceMemberEntity);
    const actor = await memberRepository.findOneBy({ workspaceId, userId });

    if (actor === null || !memberRoleManagers.has(actor.role)) {
      return { status: "forbidden" };
    }

    const member = await memberRepository.findOneBy({ id: memberId, workspaceId });

    if (member === null) {
      return { status: "member_not_found" };
    }

    if (
      member.role === "owner" ||
      (actor.role === "admin" && (member.role === "admin" || input.role === "admin"))
    ) {
      return { status: "forbidden" };
    }

    const updatedMember = await dataSource.transaction(
      async (manager): Promise<WorkspaceMemberEntity> => {
        member.role = input.role;
        return manager.getRepository(WorkspaceMemberEntity).save(member);
      },
    );
    const user = await dataSource.getRepository(UserEntity).findOneBy({ id: updatedMember.userId });

    if (user === null) {
      return { status: "member_not_found" };
    }

    return { member: toWorkspaceMember(updatedMember, user), status: "updated" };
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
