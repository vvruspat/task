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
import { TaskActivityEventDto } from "./activity.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { ActivityService } from "./activity.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("activity")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/projects/:projectId/tasks/:taskId/activity")
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: "List activity history for a visible task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiOkResponse({ isArray: true, type: TaskActivityEventDto })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  listTaskActivity(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskActivityEventDto[]> {
    return this.activityService.listTaskActivity(workspaceId, projectId, taskId, userId);
  }
}
