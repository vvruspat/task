import type {
  GoogleDrivePickerSession,
  GoogleDriveRootFolder,
  IntegrationCatalogItem,
  TelegramConnectToken,
  WorkspaceIntegration,
} from "@task/api-client";

const authKinds = new Set(["app_installation", "bot_token", "oauth2"]);
const capabilityKinds = new Set([
  "agent_tool_provider",
  "attachment_exporter",
  "conversation_ingress",
  "domain_event_consumer",
  "resource_provider",
  "webhook_handler",
]);
const integrationStatuses = new Set(["authorizing", "connected", "disconnected", "error"]);
const integrationHealthStatuses = new Set(["healthy", "degraded", "error", "inactive"]);
const integrationConnectionHealthStatuses = new Set([
  "connected",
  "disconnected",
  "error",
  "missing",
]);

export function isWorkspaceIntegration(value: unknown): value is WorkspaceIntegration {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "pluginKey") &&
    hasString(value, "pluginVersion") &&
    isKnownString(value["status"], integrationStatuses) &&
    isObject(value["config"]) &&
    hasString(value, "installedByUserId") &&
    hasNullableString(value, "connectedByUserId") &&
    hasNullableString(value, "connectedAt") &&
    hasNullableString(value, "disconnectedAt") &&
    hasNullableString(value, "lastError") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
}

export function isIntegrationCatalog(value: unknown): value is IntegrationCatalogItem[] {
  return Array.isArray(value) && value.every(isIntegrationCatalogItem);
}

export function isGoogleDrivePickerSession(value: unknown): value is GoogleDrivePickerSession {
  return (
    isObject(value) &&
    hasNonEmptyString(value, "accessToken") &&
    hasNonEmptyString(value, "appId") &&
    hasNonEmptyString(value, "developerKey") &&
    hasString(value, "expiresAt")
  );
}

export function isGoogleDriveRootFolder(value: unknown): value is GoogleDriveRootFolder {
  return (
    isObject(value) &&
    hasString(value, "externalResourceId") &&
    hasNonEmptyString(value, "name") &&
    hasNonEmptyString(value, "providerResourceId") &&
    hasNullableString(value, "webUrl")
  );
}

export function isTelegramConnectToken(value: unknown): value is TelegramConnectToken {
  if (!isObject(value)) return false;
  const expiresAt = value["expiresAt"];
  return (
    hasNonEmptyString(value, "command") &&
    typeof expiresAt === "string" &&
    Number.isFinite(Date.parse(expiresAt))
  );
}

export function readGoogleDriveRootFolderConfig(
  installation: WorkspaceIntegration,
): GoogleDriveRootFolder | null {
  const rootFolder = installation.config["rootFolder"];
  return isGoogleDriveRootFolder(rootFolder) ? rootFolder : null;
}

function isIntegrationCatalogItem(value: unknown): value is IntegrationCatalogItem {
  return (
    isObject(value) &&
    hasString(value, "pluginKey") &&
    hasString(value, "pluginVersion") &&
    hasString(value, "name") &&
    hasString(value, "description") &&
    hasString(value, "iconKey") &&
    isKnownString(value["authKind"], authKinds) &&
    isStringArray(value["requiredScopes"]) &&
    Array.isArray(value["capabilityKinds"]) &&
    value["capabilityKinds"].every((kind) => isKnownString(kind, capabilityKinds)) &&
    (value["installation"] === null || isWorkspaceIntegration(value["installation"])) &&
    (value["health"] === null || isWorkspaceIntegrationHealth(value["health"]))
  );
}

function isWorkspaceIntegrationHealth(value: unknown): boolean {
  if (!isObject(value)) return false;
  const connection = value["connection"];
  return (
    isKnownString(value["status"], integrationHealthStatuses) &&
    hasString(value, "checkedAt") &&
    isObject(connection) &&
    isKnownString(connection["status"], integrationConnectionHealthStatuses) &&
    hasNullableString(connection, "lastError") &&
    hasNonNegativeIntegerProperties(value["subscriptions"], [
      "activeCount",
      "renewingCount",
      "expiredCount",
      "errorCount",
      "stoppedCount",
    ]) &&
    hasNonNegativeIntegerProperties(value["deliveries"], [
      "pendingCount",
      "processingCount",
      "succeededCount",
      "deadCount",
    ]) &&
    hasNonNegativeIntegerProperties(value["webhooks"], [
      "receivedCount",
      "processingCount",
      "processedCount",
      "ignoredCount",
      "failedCount",
    ])
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string";
}

function hasNonEmptyString(value: Record<string, unknown>, key: string): boolean {
  const property = value[key];
  return typeof property === "string" && property.length > 0;
}

function hasNullableString(value: Record<string, unknown>, key: string): boolean {
  return value[key] === null || typeof value[key] === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasNonNegativeIntegerProperties(value: unknown, keys: readonly string[]): boolean {
  if (!isObject(value)) return false;
  return keys.every((key) => {
    const property = value[key];
    return typeof property === "number" && Number.isSafeInteger(property) && property >= 0;
  });
}

function isKnownString(value: unknown, values: ReadonlySet<string>): value is string {
  return typeof value === "string" && values.has(value);
}
