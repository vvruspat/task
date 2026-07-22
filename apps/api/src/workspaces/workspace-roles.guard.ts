import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the reflector value at runtime.
import { Reflector } from "@nestjs/core";
import {
  parseTrustedCurrentUserId,
  trustedCurrentUserIdHeader,
} from "../auth/trusted-current-user.decorator.js";
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import { workspaceRolesMetadataKey } from "./workspace-roles.decorator.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { WorkspacesService } from "./workspaces.service.js";

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<readonly WorkspaceMemberRole[]>(
      workspaceRolesMetadataKey,
      [context.getHandler(), context.getClass()],
    );
    if (requiredRoles === undefined) return true;

    const request = context.switchToHttp().getRequest<WorkspaceRoleRequest>();
    const workspaceId = parseWorkspaceId(request.params.workspaceId);
    const userId = parseTrustedCurrentUserId(request.headers[trustedCurrentUserIdHeader]);
    const actualRole = await this.workspacesService.getMemberRole(workspaceId, userId);

    if (!isWorkspaceRoleAllowed(requiredRoles, actualRole)) {
      throw new ForbiddenException("Current workspace role cannot access this endpoint.");
    }
    return true;
  }
}

export function isWorkspaceRoleAllowed(
  requiredRoles: readonly WorkspaceMemberRole[],
  actualRole: WorkspaceMemberRole | null,
): boolean {
  return actualRole !== null && requiredRoles.includes(actualRole);
}

export function parseWorkspaceId(value: string | undefined): string {
  if (value === undefined || !uuidV4Pattern.test(value)) {
    throw new BadRequestException("workspaceId must be a UUID v4 value.");
  }
  return value;
}

type WorkspaceRoleRequest = {
  headers: Record<string, string | string[] | undefined>;
  params: { workspaceId?: string };
};

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
