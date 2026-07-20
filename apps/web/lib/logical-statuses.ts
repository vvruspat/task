import type { WorkspaceStatus } from "@task/api-client";

export const noStatusKey = "none";
const logicalStatusPrefix = "status-name:";

export type LogicalStatus = {
  color: string;
  key: string;
  name: string;
  position: number;
};

export function normalizeStatusName(name: string): string {
  return displayStatusName(name).toLocaleLowerCase("ru");
}

export function logicalStatusKeyFromName(name: string): string {
  return `${logicalStatusPrefix}${encodeURIComponent(normalizeStatusName(name))}`;
}

export function mergeLogicalStatuses(statuses: readonly WorkspaceStatus[]): LogicalStatus[] {
  const merged = new Map<string, LogicalStatus>();

  for (const status of statuses) {
    const key = logicalStatusKeyFromName(status.name);
    const position = numericPosition(status.position);
    const existing = merged.get(key);
    if (existing === undefined || position < existing.position) {
      merged.set(key, { color: status.color, key, name: displayStatusName(status.name), position });
    }
  }

  return [...merged.values()].sort(
    (left, right) => left.position - right.position || left.name.localeCompare(right.name, "ru"),
  );
}

export function logicalStatusKeyForTask(
  statusId: string | null | undefined,
  statuses: readonly WorkspaceStatus[],
): string {
  if (statusId === null || statusId === undefined) return noStatusKey;
  const status = statuses.find((candidate) => candidate.id === statusId);
  return status === undefined ? `status-id:${statusId}` : logicalStatusKeyFromName(status.name);
}

export function normalizeStatusFilterValue(
  value: string | null,
  statuses: readonly WorkspaceStatus[],
): string | null {
  if (value === null || value === noStatusKey || value.startsWith(logicalStatusPrefix))
    return value;
  const legacyStatus = statuses.find((status) => status.id === value);
  return legacyStatus === undefined ? value : logicalStatusKeyFromName(legacyStatus.name);
}

export function resolveProjectStatusId(
  projectId: string,
  logicalKey: string,
  statuses: readonly WorkspaceStatus[],
): string | null | undefined {
  if (logicalKey === noStatusKey) return null;
  return statuses.find(
    (status) =>
      status.projectId === projectId && logicalStatusKeyFromName(status.name) === logicalKey,
  )?.id;
}

function numericPosition(position: string): number {
  const value = Number(position);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function displayStatusName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ");
}
