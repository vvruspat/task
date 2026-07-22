import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { loadApiConfig } from "../config.js";
import type { SendInvitationEmailInput } from "./invitations.contracts.js";
import type { InvitationMailer } from "./invitations.store.js";

type BrevoResponse = { messageId: string };

export type BrevoInvitationPayload = {
  params: {
    link: string;
    username: string;
    workspace_name: string;
  };
  tags: ["workspace-invitation"];
  templateId: number;
  to: [{ email: string }];
};

@Injectable()
export class BrevoInvitationMailer implements InvitationMailer {
  async send(input: SendInvitationEmailInput): Promise<void> {
    const config = loadApiConfig().email;
    if (config === null) {
      throw new ServiceUnavailableException("Email invitations are not configured.");
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": config.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(createBrevoInvitationPayload(config, input)),
    });

    const body: unknown = await response.json().catch((): null => null);
    if (!response.ok || !isBrevoResponse(body)) {
      throw new ServiceUnavailableException("Brevo could not send the invitation email.");
    }
  }
}

export function createBrevoInvitationPayload(
  config: { templateId: number; webAppUrl: string },
  input: SendInvitationEmailInput,
): BrevoInvitationPayload {
  return {
    params: {
      link: `${config.webAppUrl}/invite/${encodeURIComponent(input.token)}`,
      username: input.inviterName,
      workspace_name: input.workspaceName,
    },
    tags: ["workspace-invitation"],
    templateId: config.templateId,
    to: [{ email: input.email }],
  };
}

function isBrevoResponse(value: unknown): value is BrevoResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "messageId" in value &&
    typeof value.messageId === "string" &&
    value.messageId.length > 0
  );
}
