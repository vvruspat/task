export const backlogStatusName = "Backlog";
export const inProgressStatusName = "In progress";

const requiredStatusNames = new Map([
  [normalizeStatusName(backlogStatusName), backlogStatusName],
  [normalizeStatusName(inProgressStatusName), inProgressStatusName],
]);

export function requiredProjectStatusName(name: string): string | null {
  return requiredStatusNames.get(normalizeStatusName(name)) ?? null;
}

export function isBacklogStatusName(name: string): boolean {
  return normalizeStatusName(name) === normalizeStatusName(backlogStatusName);
}

export function isInProgressStatusName(name: string): boolean {
  return normalizeStatusName(name) === normalizeStatusName(inProgressStatusName);
}

function normalizeStatusName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en");
}
