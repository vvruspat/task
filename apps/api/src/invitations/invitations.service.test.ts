import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException, ForbiddenException, GoneException } from "@nestjs/common";
import type {
  AcceptInvitationResult,
  InvitationPreview,
  WorkspaceInvitation,
} from "./invitations.contracts.js";
import { InvitationsService } from "./invitations.service.js";
import type {
  AcceptStoredInvitationResult,
  InvitationMailer,
  PersistInvitationResult,
  RevokeInvitationResult,
  WorkspaceInvitationStore,
} from "./invitations.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const invitationId = "33333333-3333-4333-8333-333333333333";
const date = new Date("2026-07-21T12:00:00.000Z");

const invitation: WorkspaceInvitation = {
  createdAt: date,
  email: "teammate@example.com",
  expiresAt: new Date("2026-07-28T12:00:00.000Z"),
  id: invitationId,
  role: "member",
  status: "pending",
  workspaceId,
};

test("InvitationsService creates an invitation and sends the raw token only to the mailer", async () => {
  const sentTokens: string[] = [];
  const store = createStore({
    createResult: {
      invitation,
      inviterName: "Alex",
      status: "created",
      workspaceName: "Studio",
    },
  });
  const service = new InvitationsService(store, {
    send: async (input): Promise<void> => {
      sentTokens.push(input.token);
    },
  });

  const result = await service.create(workspaceId, userId, {
    email: invitation.email,
    role: invitation.role,
  });

  assert.equal(result.id, invitationId);
  assert.equal(sentTokens.length, 1);
  assert.match(sentTokens[0] ?? "", /^[A-Za-z0-9_-]{43}$/u);
});

test("InvitationsService rejects duplicate and unauthorized invitations", async () => {
  const mailer = successfulMailer();
  await assert.rejects(
    () =>
      new InvitationsService(
        createStore({ createResult: { status: "invitation_exists" } }),
        mailer,
      ).create(workspaceId, userId, { email: invitation.email, role: "member" }),
    ConflictException,
  );
  await assert.rejects(
    () =>
      new InvitationsService(createStore({ createResult: { status: "forbidden" } }), mailer).create(
        workspaceId,
        userId,
        { email: invitation.email, role: "member" },
      ),
    ForbiddenException,
  );
});

test("InvitationsService revokes a persisted invitation when Brevo delivery fails", async () => {
  let revokedInvitationId: string | null = null;
  const store = createStore({
    createResult: {
      invitation,
      inviterName: "Alex",
      status: "created",
      workspaceName: "Studio",
    },
    onDeliveryFailure: (id): void => {
      revokedInvitationId = id;
    },
  });
  const service = new InvitationsService(store, {
    send: async (): Promise<void> => {
      throw new Error("delivery failed");
    },
  });

  await assert.rejects(
    () => service.create(workspaceId, userId, { email: invitation.email, role: "member" }),
    /delivery failed/,
  );
  assert.equal(revokedInvitationId, invitationId);
});

test("InvitationsService accepts a valid invitation and preserves terminal states", async () => {
  const acceptance = createAcceptance();
  const accepted = await new InvitationsService(
    createStore({ acceptResult: { acceptance, status: "accepted" } }),
    successfulMailer(),
  ).accept("a".repeat(43), userId);
  assert.equal(accepted.workspace.id, workspaceId);
  assert.equal(accepted.member.userId, userId);

  await assert.rejects(
    () =>
      new InvitationsService(
        createStore({ acceptResult: { status: "expired" } }),
        successfulMailer(),
      ).accept("a".repeat(43), userId),
    GoneException,
  );
});

function createAcceptance(): AcceptInvitationResult {
  return {
    member: {
      avatarUrl: null,
      createdAt: date,
      displayName: "Teammate",
      email: invitation.email,
      id: "44444444-4444-4444-8444-444444444444",
      role: "member",
      updatedAt: date,
      userId,
      workspaceId,
    },
    workspace: {
      createdAt: date,
      id: workspaceId,
      name: "Studio",
      slug: "studio",
      updatedAt: date,
    },
  };
}

function successfulMailer(): InvitationMailer {
  return { send: async (): Promise<void> => undefined };
}

function createStore(options: {
  acceptResult?: AcceptStoredInvitationResult;
  createResult?: PersistInvitationResult;
  onDeliveryFailure?: (invitationId: string) => void;
  preview?: InvitationPreview | null;
  revokeResult?: RevokeInvitationResult;
}): WorkspaceInvitationStore {
  return {
    accept: async (): Promise<AcceptStoredInvitationResult> =>
      options.acceptResult ?? { status: "invalid" },
    create: async (): Promise<PersistInvitationResult> =>
      options.createResult ?? { status: "workspace_not_found" },
    getPreview: async (): Promise<InvitationPreview | null> => options.preview ?? null,
    list: async (): Promise<WorkspaceInvitation[] | null> => [],
    revoke: async (): Promise<RevokeInvitationResult> =>
      options.revokeResult ?? { status: "invitation_not_found" },
    revokeAfterDeliveryFailure: async (id): Promise<void> => {
      options.onDeliveryFailure?.(id);
    },
  };
}
