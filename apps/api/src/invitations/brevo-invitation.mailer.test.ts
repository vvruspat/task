import assert from "node:assert/strict";
import test from "node:test";
import { createBrevoInvitationPayload } from "./brevo-invitation.mailer.js";

test("createBrevoInvitationPayload maps the Invitation template variables", () => {
  const payload = createBrevoInvitationPayload(
    { templateId: 6, webAppUrl: "https://task.example" },
    {
      email: "invitee@example.com",
      inviterName: "Alex",
      role: "member",
      token: "token with/slash",
      workspaceName: "Product",
    },
  );

  assert.deepEqual(payload, {
    params: {
      link: "https://task.example/invite/token%20with%2Fslash",
      username: "Alex",
      workspace_name: "Product",
    },
    tags: ["workspace-invitation"],
    templateId: 6,
    to: [{ email: "invitee@example.com" }],
  });
});
