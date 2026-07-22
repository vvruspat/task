import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, IsNull, LessThanOrEqual } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  InviteEntity,
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { WorkspaceMember } from "../workspaces/workspaces.contracts.js";
import type {
  InvitationPreview,
  InvitationRole,
  InvitationStatus,
  WorkspaceInvitation,
} from "./invitations.contracts.js";
import type {
  AcceptStoredInvitationResult,
  PersistInvitationInput,
  PersistInvitationResult,
  RevokeInvitationResult,
  WorkspaceInvitationStore,
} from "./invitations.store.js";

const invitationManagers = new Set(["owner", "admin"]);

@Injectable()
export class TypeOrmInvitationsStore implements WorkspaceInvitationStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async create(input: PersistInvitationInput, now: Date): Promise<PersistInvitationResult> {
    const dataSource = await this.getInitializedDataSource();
    try {
      return await dataSource.transaction(async (manager): Promise<PersistInvitationResult> => {
        const workspace = await manager.getRepository(WorkspaceEntity).findOneBy({
          id: input.workspaceId,
        });
        if (workspace === null) return { status: "workspace_not_found" };

        const actorMembership = await manager.getRepository(WorkspaceMemberEntity).findOneBy({
          userId: input.actorUserId,
          workspaceId: input.workspaceId,
        });
        if (actorMembership === null || !invitationManagers.has(actorMembership.role)) {
          return { status: "forbidden" };
        }
        if (actorMembership.role === "admin" && input.role === "admin") {
          return { status: "forbidden" };
        }
        const actor = await manager.getRepository(UserEntity).findOneBy({ id: input.actorUserId });
        if (actor === null) return { status: "forbidden" };

        const inviteRepository = manager.getRepository(InviteEntity);
        await inviteRepository.update(
          {
            expiresAt: LessThanOrEqual(now),
            revokedAt: IsNull(),
            usedAt: IsNull(),
            workspaceId: input.workspaceId,
          },
          { revokedAt: now },
        );

        const invitedUsers = await manager
          .getRepository(UserEntity)
          .createQueryBuilder("user")
          .where("lower(user.email) = :email", { email: input.email })
          .orderBy("user.createdAt", "ASC")
          .limit(2)
          .getMany();
        if (invitedUsers.length > 1) return { status: "email_ambiguous" };
        const invitedUser = invitedUsers.length === 1 ? invitedUsers[0] : undefined;
        if (invitedUser !== undefined) {
          const membership = await manager.getRepository(WorkspaceMemberEntity).findOneBy({
            userId: invitedUser.id,
            workspaceId: input.workspaceId,
          });
          if (membership !== null) return { status: "already_member" };
        }

        const activeInvitation = await inviteRepository
          .createQueryBuilder("invite")
          .where("invite.workspaceId = :workspaceId", { workspaceId: input.workspaceId })
          .andWhere("lower(invite.email) = :email", { email: input.email })
          .andWhere("invite.usedAt IS NULL")
          .andWhere("invite.revokedAt IS NULL")
          .getOne();
        if (activeInvitation !== null) return { status: "invitation_exists" };

        const invitation = new InviteEntity();
        invitation.workspaceId = input.workspaceId;
        invitation.invitedUserId = invitedUser?.id ?? null;
        invitation.email = input.email;
        invitation.tokenHash = input.tokenHash;
        invitation.role = input.role;
        invitation.expiresAt = input.expiresAt;
        invitation.createdByUserId = input.actorUserId;
        const saved = await inviteRepository.save(invitation);

        return {
          invitation: toWorkspaceInvitation(saved, now),
          inviterName: actor.displayName,
          status: "created",
          workspaceName: workspace.name,
        };
      });
    } catch (error: unknown) {
      if (
        readDatabaseErrorProperty(error, "code") === "23505" &&
        readDatabaseErrorProperty(error, "constraint") === "uq_invites_active_workspace_email"
      ) {
        return { status: "invitation_exists" };
      }
      throw error;
    }
  }

  async list(
    workspaceId: string,
    userId: string,
    now: Date,
  ): Promise<WorkspaceInvitation[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const actor = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      userId,
      workspaceId,
    });
    if (actor === null || !invitationManagers.has(actor.role)) return null;
    const invitations = await dataSource.getRepository(InviteEntity).find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
      take: 50,
    });
    return invitations.map((invitation) => toWorkspaceInvitation(invitation, now));
  }

  async getPreview(tokenHash: string, now: Date): Promise<InvitationPreview | null> {
    const dataSource = await this.getInitializedDataSource();
    const invitation = await dataSource.getRepository(InviteEntity).findOneBy({ tokenHash });
    if (invitation === null) return null;
    const workspace = await dataSource.getRepository(WorkspaceEntity).findOneBy({
      id: invitation.workspaceId,
    });
    if (workspace === null) return null;
    return {
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      role: toInvitationRole(invitation.role),
      status: toInvitationStatus(invitation, now),
      workspaceId: invitation.workspaceId,
      workspaceName: workspace.name,
    };
  }

  async accept(
    tokenHash: string,
    userId: string,
    now: Date,
  ): Promise<AcceptStoredInvitationResult> {
    const dataSource = await this.getInitializedDataSource();
    return dataSource.transaction(async (manager): Promise<AcceptStoredInvitationResult> => {
      const invitation = await manager.getRepository(InviteEntity).findOne({
        lock: { mode: "pessimistic_write" },
        where: { tokenHash },
      });
      if (invitation === null) return { status: "invalid" };
      const status = toInvitationStatus(invitation, now);
      if (status !== "pending") return { status };

      const user = await manager.getRepository(UserEntity).findOneBy({ id: userId });
      if (
        user === null ||
        user.email === null ||
        user.email.toLowerCase() !== invitation.email.toLowerCase() ||
        (invitation.invitedUserId !== null && invitation.invitedUserId !== userId)
      ) {
        return { status: "forbidden" };
      }
      const workspace = await manager.getRepository(WorkspaceEntity).findOneBy({
        id: invitation.workspaceId,
      });
      if (workspace === null) return { status: "invalid" };

      const memberRepository = manager.getRepository(WorkspaceMemberEntity);
      let member = await memberRepository.findOneBy({
        userId,
        workspaceId: invitation.workspaceId,
      });
      if (member === null) {
        member = new WorkspaceMemberEntity();
        member.userId = userId;
        member.workspaceId = invitation.workspaceId;
        member.role = toInvitationRole(invitation.role);
        member = await memberRepository.save(member);
      }
      invitation.usedAt = now;
      await manager.getRepository(InviteEntity).save(invitation);
      return {
        acceptance: {
          member: toWorkspaceMember(member, user),
          workspace: {
            createdAt: workspace.createdAt,
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            updatedAt: workspace.updatedAt,
          },
        },
        status: "accepted",
      };
    });
  }

  async revoke(
    workspaceId: string,
    invitationId: string,
    userId: string,
    now: Date,
  ): Promise<RevokeInvitationResult> {
    const dataSource = await this.getInitializedDataSource();
    const actor = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      userId,
      workspaceId,
    });
    if (actor === null || !invitationManagers.has(actor.role)) return { status: "forbidden" };
    const repository = dataSource.getRepository(InviteEntity);
    const invitation = await repository.findOneBy({ id: invitationId, workspaceId });
    if (invitation === null || toInvitationStatus(invitation, now) !== "pending") {
      return { status: "invitation_not_found" };
    }
    if (actor.role === "admin" && invitation.role === "admin") return { status: "forbidden" };
    invitation.revokedAt = now;
    const saved = await repository.save(invitation);
    return { invitation: toWorkspaceInvitation(saved, now), status: "revoked" };
  }

  async revokeAfterDeliveryFailure(invitationId: string, now: Date): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource
      .getRepository(InviteEntity)
      .update({ id: invitationId, revokedAt: IsNull(), usedAt: IsNull() }, { revokedAt: now });
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) throw new ServiceUnavailableException("Database is not configured.");
    if (dataSource.isInitialized) return dataSource;
    this.initialization ??= dataSource.initialize();
    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

function toWorkspaceInvitation(invitation: InviteEntity, now: Date): WorkspaceInvitation {
  return {
    createdAt: invitation.createdAt,
    email: invitation.email,
    expiresAt: invitation.expiresAt,
    id: invitation.id,
    role: toInvitationRole(invitation.role),
    status: toInvitationStatus(invitation, now),
    workspaceId: invitation.workspaceId,
  };
}

function toInvitationStatus(invitation: InviteEntity, now: Date): InvitationStatus {
  if (invitation.revokedAt !== null) return "revoked";
  if (invitation.usedAt !== null) return "used";
  if (invitation.expiresAt.getTime() <= now.getTime()) return "expired";
  return "pending";
}

function toInvitationRole(role: InviteEntity["role"]): InvitationRole {
  if (role === "admin" || role === "member" || role === "guest") return role;
  throw new Error("Invitation has an invalid owner role.");
}

function toWorkspaceMember(member: WorkspaceMemberEntity, user: UserEntity): WorkspaceMember {
  return {
    avatarUrl: user.avatarUrl,
    createdAt: member.createdAt,
    displayName: user.displayName,
    email: user.email,
    id: member.id,
    role: member.role,
    updatedAt: member.updatedAt,
    userId: member.userId,
    workspaceId: member.workspaceId,
  };
}

function readDatabaseErrorProperty(error: unknown, key: "code" | "constraint"): string | null {
  if (!isUnknownRecord(error)) return null;
  const value = error[key];
  if (typeof value === "string") return value;
  return readDatabaseErrorProperty(error["driverError"], key);
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
