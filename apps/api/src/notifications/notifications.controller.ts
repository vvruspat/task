import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from "@nestjs/common";
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
import { NotificationFeedDto, TaskSubscriptionDto } from "./notifications.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { NotificationsService } from "./notifications.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("notifications")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/notifications")
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List notifications for the current workspace member" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ type: NotificationFeedDto })
  list(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<NotificationFeedDto> {
    return this.service.list(workspaceId, userId);
  }

  @Post("read")
  @HttpCode(200)
  @ApiOperation({ summary: "Mark all workspace notifications as read" })
  @ApiOkResponse({ type: NotificationFeedDto })
  markAllRead(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<NotificationFeedDto> {
    return this.service.markAllRead(workspaceId, userId);
  }
}

@ApiTags("notifications")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/projects/:projectId/tasks/:taskId/subscription")
export class TaskSubscriptionsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOkResponse({ type: TaskSubscriptionDto })
  @ApiNotFoundResponse({ description: "Task is missing or not visible." })
  get(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskSubscriptionDto> {
    return this.service.subscription(workspaceId, projectId, taskId, userId);
  }

  @Put()
  @ApiOkResponse({ type: TaskSubscriptionDto })
  subscribe(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskSubscriptionDto> {
    return this.service.subscribe(workspaceId, projectId, taskId, userId);
  }

  @Delete()
  @ApiOkResponse({ type: TaskSubscriptionDto })
  unsubscribe(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskSubscriptionDto> {
    return this.service.unsubscribe(workspaceId, projectId, taskId, userId);
  }
}
