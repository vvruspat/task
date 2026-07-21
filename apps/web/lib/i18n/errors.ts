import type { MessageKey } from "./messages";

const workspaceErrorKeys: Readonly<Record<string, MessageKey>> = {
  workspace_invalid_response: "workspace.invalidResponse",
  workspace_unreachable: "workspace.unreachable",
};

export function localizeWorkspaceError(
  error: string | null,
  t: (key: MessageKey) => string,
  fallback: MessageKey,
): string {
  if (error === null) return t(fallback);
  const key = workspaceErrorKeys[error];
  return key === undefined ? error : t(key);
}
