import { applyDecorators, SetMetadata } from "@nestjs/common";
import { ApiForbiddenResponse } from "@nestjs/swagger";
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";

export const workspaceRolesMetadataKey = "task:workspace-roles";

export function WorkspaceRoles(
  ...roles: readonly WorkspaceMemberRole[]
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(workspaceRolesMetadataKey, roles),
    ApiForbiddenResponse({ description: "Current workspace role cannot access this endpoint." }),
  );
}
