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
import { ProjectDetailDto, ProjectSummaryDto } from "./projects.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { ProjectsService } from "./projects.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("projects")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: "List active projects in a visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: ProjectSummaryDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  listActiveProjects(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<ProjectSummaryDto[]> {
    return this.projectsService.listActiveProjects(workspaceId, userId);
  }

  @Get(":projectId")
  @ApiOperation({ summary: "Get one project in a visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiOkResponse({ type: ProjectDetailDto })
  @ApiNotFoundResponse({
    description: "Workspace or project is missing or not visible to the current user.",
  })
  getProject(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<ProjectDetailDto> {
    return this.projectsService.getProject(workspaceId, projectId, userId);
  }
}
