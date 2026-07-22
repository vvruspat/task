import {
  defineIntegrationPlugin,
  type IntegrationAgentToolProvider,
  type IntegrationDomainEventHandler,
  type IntegrationPluginManifest,
} from "@task/integration-sdk";

export const googleDriveOAuthScopes = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/drive.file",
] as const;

export const googleDriveIntegrationManifest: IntegrationPluginManifest = {
  apiVersion: 1,
  auth: {
    kind: "oauth2",
    scopes: googleDriveOAuthScopes,
  },
  capabilities: [
    {
      kind: "domain_event_consumer",
      eventNames: [
        "attachment.created.v1",
        "comment.created.v1",
        "integration.connected.v1",
        "task.archived.v1",
        "task.created.v1",
        "task.updated.v1",
      ],
    },
    { kind: "resource_provider", resourceKinds: ["file", "folder"] },
    { kind: "attachment_exporter", targetResourceKinds: ["folder"] },
    { kind: "webhook_handler" },
    { kind: "agent_tool_provider", namespace: "gdrive" },
  ],
  description:
    "Create task folders, export attachments, watch linked Drive resources, and provide Drive tools to the workspace agent.",
  iconKey: "google-drive",
  name: "Google Drive",
  pluginKey: "google-drive",
  pluginVersion: "0.1.0",
};

export const googleDriveIntegrationPlugin = defineIntegrationPlugin(googleDriveIntegrationManifest);

export function createGoogleDriveIntegrationPlugin(
  handleDomainEvent: IntegrationDomainEventHandler,
  agentTools?: IntegrationAgentToolProvider,
): ReturnType<typeof defineIntegrationPlugin> {
  return defineIntegrationPlugin(
    googleDriveIntegrationManifest,
    agentTools === undefined ? { handleDomainEvent } : { agentTools, handleDomainEvent },
  );
}
