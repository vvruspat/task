export const integrationPluginApiVersion = 1 as const;

export const integrationDomainEventNames = [
  "attachment.created.v1",
  "comment.created.v1",
  "integration.connected.v1",
  "task.archived.v1",
  "task.created.v1",
  "task.updated.v1",
] as const;

export type IntegrationDomainEventName = (typeof integrationDomainEventNames)[number];

export type IntegrationDomainEventEntity = {
  id: string;
  type: string;
};

export type IntegrationDomainEvent = {
  id: string;
  workspaceId: string;
  name: IntegrationDomainEventName;
  actorUserId: string | null;
  entity: IntegrationDomainEventEntity;
  payload: Readonly<Record<string, unknown>>;
  occurredAt: string;
};

export type IntegrationDomainEventHandlerContext = {
  installationId: string;
  pluginKey: string;
  pluginVersion: string;
  idempotencyKey: string;
  attempt: number;
};

export type IntegrationDomainEventHandler = (
  event: IntegrationDomainEvent,
  context: IntegrationDomainEventHandlerContext,
) => Promise<void>;

export type IntegrationPluginHandlers = {
  handleDomainEvent?: IntegrationDomainEventHandler;
};

export type IntegrationSecretReference = string;

export interface IntegrationSecretProvider {
  put(value: string): Promise<IntegrationSecretReference>;
  read(reference: IntegrationSecretReference): Promise<string | null>;
  delete(reference: IntegrationSecretReference): Promise<void>;
}

export const integrationCapabilityKinds = [
  "agent_tool_provider",
  "attachment_exporter",
  "conversation_ingress",
  "domain_event_consumer",
  "resource_provider",
  "webhook_handler",
] as const;

export type IntegrationCapabilityKind = (typeof integrationCapabilityKinds)[number];

export const integrationAuthKinds = ["app_installation", "bot_token", "oauth2"] as const;

export type IntegrationAuthKind = (typeof integrationAuthKinds)[number];

export type IntegrationAuthDefinition = {
  kind: IntegrationAuthKind;
  scopes: readonly string[];
};

export type AgentToolProviderCapability = {
  kind: "agent_tool_provider";
  namespace: string;
};

export type AttachmentExporterCapability = {
  kind: "attachment_exporter";
  targetResourceKinds: readonly string[];
};

export type ConversationIngressCapability = {
  kind: "conversation_ingress";
};

export type DomainEventConsumerCapability = {
  kind: "domain_event_consumer";
  eventNames: readonly IntegrationDomainEventName[];
};

export type ResourceProviderCapability = {
  kind: "resource_provider";
  resourceKinds: readonly string[];
};

export type WebhookHandlerCapability = {
  kind: "webhook_handler";
};

export type IntegrationCapability =
  | AgentToolProviderCapability
  | AttachmentExporterCapability
  | ConversationIngressCapability
  | DomainEventConsumerCapability
  | ResourceProviderCapability
  | WebhookHandlerCapability;

export type IntegrationPluginManifest = {
  apiVersion: typeof integrationPluginApiVersion;
  auth: IntegrationAuthDefinition;
  capabilities: readonly IntegrationCapability[];
  description: string;
  iconKey: string;
  name: string;
  pluginKey: string;
  pluginVersion: string;
};

export type IntegrationPlugin = {
  manifest: IntegrationPluginManifest;
  handlers?: IntegrationPluginHandlers;
};

export function defineIntegrationPlugin(
  manifest: IntegrationPluginManifest,
  handlers?: IntegrationPluginHandlers,
): IntegrationPlugin {
  return handlers === undefined ? { manifest } : { handlers, manifest };
}
