import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the reflector value at runtime.
import { Reflector } from "@nestjs/core";
import type { Observable } from "rxjs";
import { tap } from "rxjs";
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import {
  type WorkspaceMemberChangeKind,
  workspaceMemberChangeMetadataKey,
} from "./workspace-change.decorator.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { WorkspaceRealtimeService } from "./workspace-realtime.service.js";

const mutationMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);

type WorkspaceMutationRequest = {
  method: string;
  params?: Record<string, unknown>;
};

@Injectable()
export class WorkspaceChangeInterceptor implements NestInterceptor {
  constructor(
    private readonly realtime: WorkspaceRealtimeService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const request = context.switchToHttp().getRequest<WorkspaceMutationRequest>();
    const workspaceId = readRouteParam(request.params, "workspaceId");
    if (!mutationMethods.has(request.method.toUpperCase()) || workspaceId === null) {
      return next.handle();
    }
    const projectId = readRouteParam(request.params, "projectId");
    const taskId = readRouteParam(request.params, "taskId");
    const memberChangeKind = this.reflector.getAllAndOverride<WorkspaceMemberChangeKind>(
      workspaceMemberChangeMetadataKey,
      [context.getHandler(), context.getClass()],
    );
    return next.handle().pipe(
      tap({
        next: (value) => {
          if (memberChangeKind === undefined) return;
          const member = parseWorkspaceMemberResult(value);
          if (member === null) return;
          const input = {
            workspaceId,
            memberId: member.id,
            memberUserId: member.userId,
            memberRole: member.role,
          };
          if (memberChangeKind === "member_removed") this.realtime.publishMemberRemoved(input);
          else this.realtime.publishMemberRoleChanged(input);
        },
        complete: () => {
          if (memberChangeKind === undefined) {
            this.realtime.publishChange({ workspaceId, projectId, taskId });
          }
        },
      }),
    );
  }
}

function parseWorkspaceMemberResult(
  value: unknown,
): { id: string; userId: string; role: WorkspaceMemberRole } | null {
  if (typeof value !== "object" || value === null) return null;
  const id = "id" in value ? value.id : undefined;
  const userId = "userId" in value ? value.userId : undefined;
  const role = "role" in value ? value.role : undefined;
  return typeof id === "string" && typeof userId === "string" && isWorkspaceMemberRole(role)
    ? { id, userId, role }
    : null;
}

function isWorkspaceMemberRole(value: unknown): value is WorkspaceMemberRole {
  return value === "owner" || value === "admin" || value === "member" || value === "guest";
}

function readRouteParam(params: Record<string, unknown> | undefined, key: string): string | null {
  const value = params?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
