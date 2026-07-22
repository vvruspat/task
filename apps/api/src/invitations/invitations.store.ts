import type {
  AcceptInvitationResult,
  InvitationPreview,
  InvitationRole,
  WorkspaceInvitation,
} from "./invitations.contracts.js";

export type PersistInvitationInput = {
  actorUserId: string;
  email: string;
  expiresAt: Date;
  role: InvitationRole;
  tokenHash: string;
  workspaceId: string;
};

export type PersistInvitationResult =
  | {
      status:
        | "already_member"
        | "email_ambiguous"
        | "forbidden"
        | "invitation_exists"
        | "workspace_not_found";
    }
  | {
      invitation: WorkspaceInvitation;
      inviterName: string;
      status: "created";
      workspaceName: string;
    };

export type AcceptStoredInvitationResult =
  | { status: "expired" | "forbidden" | "invalid" | "revoked" | "used" }
  | { acceptance: AcceptInvitationResult; status: "accepted" };

export type RevokeInvitationResult =
  | { status: "forbidden" | "invitation_not_found" }
  | { invitation: WorkspaceInvitation; status: "revoked" };

export type WorkspaceInvitationStore = {
  accept(tokenHash: string, userId: string, now: Date): Promise<AcceptStoredInvitationResult>;
  create(input: PersistInvitationInput, now: Date): Promise<PersistInvitationResult>;
  getPreview(tokenHash: string, now: Date): Promise<InvitationPreview | null>;
  list(workspaceId: string, userId: string, now: Date): Promise<WorkspaceInvitation[] | null>;
  revoke(
    workspaceId: string,
    invitationId: string,
    userId: string,
    now: Date,
  ): Promise<RevokeInvitationResult>;
  revokeAfterDeliveryFailure(invitationId: string, now: Date): Promise<void>;
};

export type InvitationMailer = {
  send(input: import("./invitations.contracts.js").SendInvitationEmailInput): Promise<void>;
};
