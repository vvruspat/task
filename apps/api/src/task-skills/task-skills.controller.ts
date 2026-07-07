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
import { TaskSkillSummaryDto } from "./task-skills.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { TaskSkillsService } from "./task-skills.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("task-skills")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/task-skills")
export class TaskSkillsController {
  constructor(private readonly taskSkillsService: TaskSkillsService) {}

  @Get()
  @ApiOperation({ summary: "List active task skills for one visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: TaskSkillSummaryDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  listActiveTaskSkills(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskSkillSummaryDto[]> {
    return this.taskSkillsService.listActiveTaskSkills(workspaceId, userId);
  }
}
