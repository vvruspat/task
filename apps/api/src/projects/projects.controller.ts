import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import type { CreateProjectInput, UpdateProjectInput } from "./projects.contracts.js";
import {
  CreateProjectDto,
  ParseCreateProjectBodyPipe,
  ParseUpdateProjectBodyPipe,
  ProjectDetailDto,
  ProjectSummaryDto,
  UpdateProjectDto,
} from "./projects.dto.js";
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

  @Post()
  @ApiOperation({ summary: "Create a project in a visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiBody({ type: CreateProjectDto })
  @ApiCreatedResponse({ type: ProjectDetailDto })
  @ApiBadRequestResponse({ description: "Project payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot create projects in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  createProject(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateProjectBodyPipe()) input: CreateProjectInput,
  ): Promise<ProjectDetailDto> {
    return this.projectsService.createProject(workspaceId, userId, input);
  }

  @Delete(":projectId")
  @ApiOperation({ summary: "Archive one active project in a visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiOkResponse({ type: ProjectDetailDto })
  @ApiForbiddenResponse({ description: "Current user cannot archive projects in this workspace." })
  @ApiNotFoundResponse({
    description: "Workspace or active project is missing or not visible to the current user.",
  })
  archiveProject(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<ProjectDetailDto> {
    return this.projectsService.archiveProject(workspaceId, projectId, userId);
  }

  @Patch(":projectId")
  @ApiOperation({ summary: "Update one active project in a visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiBody({ type: UpdateProjectDto })
  @ApiOkResponse({ type: ProjectDetailDto })
  @ApiBadRequestResponse({ description: "Project payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot update projects in this workspace." })
  @ApiNotFoundResponse({
    description: "Workspace or active project is missing or not visible to the current user.",
  })
  updateProject(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateProjectBodyPipe()) input: UpdateProjectInput,
  ): Promise<ProjectDetailDto> {
    return this.projectsService.updateProject(workspaceId, projectId, userId, input);
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
