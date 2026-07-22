export type TaskAssignmentActivityPayload = {
  assigneeUserId: string | null;
  previousAssigneeUserId: string | null;
};

export function taskAssignmentActivityPayload(
  previousAssigneeUserId: string | null,
  assigneeUserId: string | null,
): TaskAssignmentActivityPayload {
  return { assigneeUserId, previousAssigneeUserId };
}
