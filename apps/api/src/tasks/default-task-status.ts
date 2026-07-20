import type { StatusRecord } from "../persistence/types/core-persistence.types.js";

type DefaultTaskStatusCandidate = Pick<StatusRecord, "id" | "isDone" | "name">;

const backlogStatusNames: ReadonlySet<string> = new Set(["backlog", "беклог", "бэклог"]);

export function selectDefaultTaskStatusId(statuses: DefaultTaskStatusCandidate[]): string | null {
  const backlog = statuses.find((status) =>
    backlogStatusNames.has(normalizeStatusName(status.name)),
  );
  if (backlog !== undefined) return backlog.id;
  return statuses.find((status) => !status.isDone)?.id ?? statuses[0]?.id ?? null;
}

function normalizeStatusName(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ru").trim();
}
