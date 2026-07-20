import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { tap } from "rxjs";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { WorkspaceRealtimeService } from "./workspace-realtime.service.js";

const mutationMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);

type WorkspaceMutationRequest = {
  method: string;
  params?: Record<string, unknown>;
};

@Injectable()
export class WorkspaceChangeInterceptor implements NestInterceptor {
  constructor(private readonly realtime: WorkspaceRealtimeService) {}

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const request = context.switchToHttp().getRequest<WorkspaceMutationRequest>();
    const workspaceId = readRouteParam(request.params, "workspaceId");
    if (!mutationMethods.has(request.method.toUpperCase()) || workspaceId === null) {
      return next.handle();
    }
    const projectId = readRouteParam(request.params, "projectId");
    const taskId = readRouteParam(request.params, "taskId");
    return next.handle().pipe(
      tap({
        complete: () => this.realtime.publishChange({ workspaceId, projectId, taskId }),
      }),
    );
  }
}

function readRouteParam(params: Record<string, unknown> | undefined, key: string): string | null {
  const value = params?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
