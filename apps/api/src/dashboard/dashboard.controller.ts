import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiTrustedCurrentUser,
  TrustedCurrentUserId,
} from "../auth/trusted-current-user.decorator.js";
import type { ListMyTasksInput } from "./dashboard.contracts.js";
import {
  DashboardOverviewDto,
  MyTasksPageDto,
  ParseListMyTasksQueryPipe,
} from "./dashboard.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { DashboardService } from "./dashboard.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });
@ApiTags("dashboard")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId")
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get("dashboard")
  @ApiOperation({ summary: "Get the workspace dashboard overview" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ type: DashboardOverviewDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible." })
  getOverview(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<DashboardOverviewDto> {
    return this.service.getOverview(workspaceId, userId);
  }
  @Get("my-tasks")
  @ApiOperation({ summary: "List the current user's active tasks by queue" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiQuery({ name: "queue", required: false, enum: ["today", "upcoming", "overdue", "review"] })
  @ApiQuery({ name: "projectId", required: false, format: "uuid", type: "string" })
  @ApiQuery({ name: "statusId", required: false, format: "uuid", type: "string" })
  @ApiQuery({ name: "page", required: false, type: Number, minimum: 1 })
  @ApiQuery({ name: "pageSize", required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiOkResponse({ type: MyTasksPageDto })
  @ApiBadRequestResponse({ description: "My tasks query is invalid." })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible." })
  listMyTasks(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Query(new ParseListMyTasksQueryPipe()) input: ListMyTasksInput,
  ): Promise<MyTasksPageDto> {
    return this.service.listMyTasks(workspaceId, userId, input);
  }
}
