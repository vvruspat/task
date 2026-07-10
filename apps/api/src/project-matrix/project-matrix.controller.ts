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
import { ProjectMatrixDto } from "./project-matrix.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { ProjectMatrixService } from "./project-matrix.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("projects")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/projects/:projectId/matrix")
export class ProjectMatrixController {
  constructor(private readonly projectMatrixService: ProjectMatrixService) {}

  @Get()
  @ApiOperation({ summary: "Get the task matrix for a visible project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiOkResponse({ type: ProjectMatrixDto })
  @ApiNotFoundResponse({ description: "Workspace or active project is missing or not visible." })
  getProjectMatrix(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<ProjectMatrixDto> {
    return this.projectMatrixService.getProjectMatrix(workspaceId, projectId, userId);
  }
}
