import type {
  TelegramBrowserConnectPreview,
  TelegramBrowserConnectResult,
  TelegramBrowserConnectWorkspace,
} from "@task/api-client";

export function isTelegramBrowserConnectPreview(
  value: unknown,
): value is TelegramBrowserConnectPreview {
  if (!isRecord(value)) return false;
  const mode = value["mode"];
  const workspace = value["workspace"];
  const workspaces = value["workspaces"];
  if (
    (mode !== "link_identity" && mode !== "connect_chat") ||
    !isNullableString(value["chatTitle"]) ||
    typeof value["expiresAt"] !== "string" ||
    !Array.isArray(workspaces) ||
    !workspaces.every(isTelegramBrowserConnectWorkspace)
  ) {
    return false;
  }
  return mode === "link_identity"
    ? isTelegramBrowserConnectWorkspace(workspace) && workspaces.length === 0
    : workspace === null;
}

export function isTelegramBrowserConnectResult(
  value: unknown,
): value is TelegramBrowserConnectResult {
  return (
    isRecord(value) &&
    (value["status"] === "identity_linked" || value["status"] === "chat_connected") &&
    isNullableString(value["chatTitle"]) &&
    isTelegramBrowserConnectWorkspace(value["workspace"])
  );
}

function isTelegramBrowserConnectWorkspace(
  value: unknown,
): value is TelegramBrowserConnectWorkspace {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["name"] === "string" &&
    typeof value["slug"] === "string"
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
