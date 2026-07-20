import { Controller, type MessageEvent, Param, ParseUUIDPipe, Sse } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiTags } from "@nestjs/swagger";
import type { Observable } from "rxjs";
import {
  ApiTrustedCurrentUser,
  TrustedCurrentUserId,
} from "../auth/trusted-current-user.decorator.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { WorkspacesService } from "../workspaces/workspaces.service.js";
import { WorkspaceRealtimeEventDto } from "./realtime.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { WorkspaceRealtimeService } from "./workspace-realtime.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("realtime")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/events")
export class WorkspaceRealtimeController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly realtime: WorkspaceRealtimeService,
  ) {}

  @Sse()
  @ApiOperation({ summary: "Stream workspace change notifications" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiProduces("text/event-stream")
  @ApiOkResponse({ type: WorkspaceRealtimeEventDto })
  async stream(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<Observable<MessageEvent>> {
    await this.workspacesService.getWorkspace(workspaceId, userId);
    return this.realtime.subscribe(workspaceId);
  }
}
