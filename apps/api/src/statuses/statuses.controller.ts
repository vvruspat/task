import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiTrustedCurrentUser,
  TrustedCurrentUserId,
} from "../auth/trusted-current-user.decorator.js";
import { WorkspaceStatusDto } from "./statuses.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { StatusesService } from "./statuses.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("statuses")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/statuses")
export class StatusesController {
  constructor(private readonly statusesService: StatusesService) {}

  @Get()
  @ApiOperation({ summary: "List statuses for one visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: WorkspaceStatusDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  listStatuses(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceStatusDto[]> {
    return this.statusesService.listStatuses(workspaceId, userId);
  }
}
