import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { WorkspaceDetailDto, WorkspaceMemberDto, WorkspaceSummaryDto } from "./workspaces.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { WorkspacesService } from "./workspaces.service.js";

const userIdHeader = "x-task-user-id";
const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("workspaces")
@ApiHeader({
  name: userIdHeader,
  description:
    "Temporary trusted user context header until AuthModule owns request identity. Not an authentication mechanism.",
  required: true,
  schema: { format: "uuid", type: "string" },
})
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: "List workspaces visible to the current user" })
  @ApiOkResponse({ isArray: true, type: WorkspaceSummaryDto })
  listWorkspaces(
    @Headers(userIdHeader) userId: string | undefined,
  ): Promise<WorkspaceSummaryDto[]> {
    return this.workspacesService.listWorkspaces(parseUserIdHeader(userId));
  }

  @Get(":workspaceId")
  @ApiOperation({ summary: "Get one workspace with members" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ type: WorkspaceDetailDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  getWorkspace(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Headers(userIdHeader) userId: string | undefined,
  ): Promise<WorkspaceDetailDto> {
    return this.workspacesService.getWorkspace(workspaceId, parseUserIdHeader(userId));
  }

  @Get(":workspaceId/members")
  @ApiOperation({ summary: "List members for one visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: WorkspaceMemberDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  listMembers(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Headers(userIdHeader) userId: string | undefined,
  ): Promise<WorkspaceMemberDto[]> {
    return this.workspacesService.listMembers(workspaceId, parseUserIdHeader(userId));
  }
}

function parseUserIdHeader(value: string | undefined): string {
  if (value === undefined || !uuidV4Pattern.test(value)) {
    throw new BadRequestException(`${userIdHeader} must be a UUID v4 value.`);
  }

  return value;
}

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
