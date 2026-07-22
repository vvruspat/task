import { createHash, randomBytes } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CreateWorkspaceInvitationInput } from "./invitations.contracts.js";
import {
  AcceptInvitationResultDto,
  InvitationPreviewDto,
  WorkspaceInvitationDto,
} from "./invitations.dto.js";
import type { InvitationMailer, WorkspaceInvitationStore } from "./invitations.store.js";

const invitationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationsService {
  constructor(
    private readonly store: WorkspaceInvitationStore,
    private readonly mailer: InvitationMailer,
  ) {}

  async create(
    workspaceId: string,
    userId: string,
    input: CreateWorkspaceInvitationInput,
  ): Promise<WorkspaceInvitationDto> {
    const now = new Date();
    const token = randomBytes(32).toString("base64url");
    const result = await this.store.create(
      {
        actorUserId: userId,
        email: input.email,
        expiresAt: new Date(now.getTime() + invitationLifetimeMilliseconds),
        role: input.role,
        tokenHash: hashToken(token),
        workspaceId,
      },
      now,
    );

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot invite workspace members.");
    }
    if (result.status === "workspace_not_found") {
      throw new NotFoundException("Workspace was not found.");
    }
    if (result.status === "already_member") {
      throw new ConflictException("A user with this email is already a workspace member.");
    }
    if (result.status === "email_ambiguous") {
      throw new ConflictException("Several users have this email; invitation is unsafe.");
    }
    if (result.status === "invitation_exists") {
      throw new ConflictException("An active invitation for this email already exists.");
    }
    if (result.status !== "created") {
      throw new ConflictException("Invitation could not be created.");
    }

    try {
      await this.mailer.send({
        email: result.invitation.email,
        inviterName: result.inviterName,
        role: result.invitation.role,
        token,
        workspaceName: result.workspaceName,
      });
    } catch (error: unknown) {
      await this.store.revokeAfterDeliveryFailure(result.invitation.id, new Date());
      throw error;
    }

    return new WorkspaceInvitationDto(result.invitation);
  }

  async list(workspaceId: string, userId: string): Promise<WorkspaceInvitationDto[]> {
    const invitations = await this.store.list(workspaceId, userId, new Date());
    if (invitations === null) {
      throw new ForbiddenException("Current user cannot view workspace invitations.");
    }
    return invitations.map((invitation) => new WorkspaceInvitationDto(invitation));
  }

  async getPreview(token: string): Promise<InvitationPreviewDto> {
    const preview = await this.store.getPreview(hashToken(token), new Date());
    if (preview === null) {
      throw new NotFoundException("Invitation was not found.");
    }
    return new InvitationPreviewDto(preview);
  }

  async accept(token: string, userId: string): Promise<AcceptInvitationResultDto> {
    const result = await this.store.accept(hashToken(token), userId, new Date());
    if (result.status === "invalid") throw new NotFoundException("Invitation was not found.");
    if (result.status === "forbidden") {
      throw new ForbiddenException("This invitation belongs to another email address.");
    }
    if (result.status === "expired") throw new GoneException("Invitation has expired.");
    if (result.status === "revoked") throw new GoneException("Invitation was revoked.");
    if (result.status === "used") throw new ConflictException("Invitation was already used.");
    if (result.status !== "accepted") throw new ConflictException("Invitation cannot be accepted.");
    return new AcceptInvitationResultDto(result.acceptance);
  }

  async revoke(
    workspaceId: string,
    invitationId: string,
    userId: string,
  ): Promise<WorkspaceInvitationDto> {
    const result = await this.store.revoke(workspaceId, invitationId, userId, new Date());
    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot revoke workspace invitations.");
    }
    if (result.status === "invitation_not_found") {
      throw new NotFoundException("Invitation was not found.");
    }
    if (result.status !== "revoked") {
      throw new NotFoundException("Invitation was not found.");
    }
    return new WorkspaceInvitationDto(result.invitation);
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
