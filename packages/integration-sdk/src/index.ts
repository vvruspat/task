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

export type IntegrationAgentToolJsonScalar = string | number | boolean | null;

export type IntegrationAgentToolJsonType =
  | "array"
  | "boolean"
  | "integer"
  | "null"
  | "number"
  | "object"
  | "string";

export type IntegrationAgentToolJsonSchema = {
  additionalProperties?: boolean;
  description?: string;
  enum?: readonly IntegrationAgentToolJsonScalar[];
  format?: string;
  items?: IntegrationAgentToolJsonSchema;
  maxItems?: number;
  maxLength?: number;
  maximum?: number;
  minItems?: number;
  minLength?: number;
  minimum?: number;
  properties?: Readonly<Record<string, IntegrationAgentToolJsonSchema>>;
  required?: readonly string[];
  type?: IntegrationAgentToolJsonType | readonly IntegrationAgentToolJsonType[];
};

export type IntegrationAgentToolInputSchema = IntegrationAgentToolJsonSchema & {
  additionalProperties: false;
  properties: Readonly<Record<string, IntegrationAgentToolJsonSchema>>;
  type: "object";
};

export type IntegrationAgentToolDefinition = {
  description: string;
  inputSchema: IntegrationAgentToolInputSchema;
  /** Short local name. The runtime prefixes it with the manifest capability namespace. */
  name: string;
  /** True only when execution cannot mutate tAsk or the external provider. */
  readOnly: boolean;
};

/** Server-owned authorization and installation context. Tool arguments must never override it. */
export type IntegrationAgentToolExecutionContext = {
  installationId: string;
  pluginKey: string;
  pluginVersion: string;
  userId: string;
  workspaceId: string;
};

export type IntegrationAgentToolCall = {
  arguments: Readonly<Record<string, unknown>>;
  /** Provider-local name, without the runtime namespace prefix. */
  name: string;
};

/** Workspace plugin boundary used by the agent runtime and the future controlled MCP adapter. */
export type IntegrationAgentToolProvider = {
  tools: readonly IntegrationAgentToolDefinition[];
  execute(
    call: IntegrationAgentToolCall,
    context: IntegrationAgentToolExecutionContext,
  ): Promise<Record<string, unknown>>;
};

export type IntegrationWebhookHeaderValue = string | readonly string[] | undefined;

export type IntegrationWebhookRequest = {
  headers: Readonly<Record<string, IntegrationWebhookHeaderValue>>;
  payload: unknown;
};

export type IntegrationWebhookVerificationResult<Payload = unknown> =
  | { status: "accepted"; payload: Payload }
  | { status: "unauthorized" };

/** Provider-owned authentication boundary for public webhook requests. */
export type IntegrationWebhookHandler<Payload = unknown> = {
  verify(
    request: IntegrationWebhookRequest,
  ): Promise<IntegrationWebhookVerificationResult<Payload>>;
};

/** Converts one authenticated provider payload into a bounded provider-specific event. */
export type IntegrationConversationIngressHandler<Event = unknown> = {
  normalize(payload: unknown): Promise<Event>;
};

export type IntegrationPluginHandlers = {
  agentTools?: IntegrationAgentToolProvider;
  conversationIngress?: IntegrationConversationIngressHandler;
  handleDomainEvent?: IntegrationDomainEventHandler;
  webhook?: IntegrationWebhookHandler;
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
