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
import { WorkspaceDetailDto, WorkspaceMemberDto, WorkspaceSummaryDto } from "./workspaces.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { WorkspacesService } from "./workspaces.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("workspaces")
@ApiTrustedCurrentUser()
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: "List workspaces visible to the current user" })
  @ApiOkResponse({ isArray: true, type: WorkspaceSummaryDto })
  listWorkspaces(@TrustedCurrentUserId() userId: string): Promise<WorkspaceSummaryDto[]> {
    return this.workspacesService.listWorkspaces(userId);
  }

  @Get(":workspaceId")
  @ApiOperation({ summary: "Get one workspace with members" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ type: WorkspaceDetailDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  getWorkspace(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceDetailDto> {
    return this.workspacesService.getWorkspace(workspaceId, userId);
  }

  @Get(":workspaceId/members")
  @ApiOperation({ summary: "List members for one visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: WorkspaceMemberDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  listMembers(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceMemberDto[]> {
    return this.workspacesService.listMembers(workspaceId, userId);
  }
}
