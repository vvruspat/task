import { SetMetadata } from "@nestjs/common";

export const workspaceMemberChangeMetadataKey = "task:workspace-member-change";

export type WorkspaceMemberChangeKind = "member_removed" | "member_role_changed";

export function PublishWorkspaceMemberChange(kind: WorkspaceMemberChangeKind): MethodDecorator {
  return SetMetadata(workspaceMemberChangeMetadataKey, kind);
}
