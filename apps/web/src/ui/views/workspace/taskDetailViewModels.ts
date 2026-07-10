export function formatTaskDueDateInput(dueAt: string | null | undefined): string {
  return dueAt?.slice(0, 10) ?? "";
}

export function toTaskDueDateValue(value: string): string | null {
  return value.length === 0 ? null : `${value}T00:00:00.000Z`;
}

export function taskStatusSelectValue(statusId: string | null | undefined): string {
  return statusId ?? "none";
}

export function isTaskLinkUrlValid(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function hasTaskDraftChanges(input: {
  comment: string;
  description: string;
  linkTitle: string;
  linkUrl: string;
  savedDescription: string;
  savedTitle: string;
  subtaskTitle: string;
  title: string;
}): boolean {
  return (
    input.title !== input.savedTitle ||
    input.description !== input.savedDescription ||
    input.comment.length > 0 ||
    input.linkUrl.length > 0 ||
    input.linkTitle.length > 0 ||
    input.subtaskTitle.length > 0
  );
}
