import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { HealthResponseDto } from "./app.dto.js";
import { CreateTaskLinkAttachmentDto, TaskAttachmentDto } from "./attachments/attachments.dto.js";
import { CreateTaskCommentDto, TaskCommentDto } from "./comments/comments.dto.js";
import {
  CreateProjectDto,
  ProjectDetailDto,
  ProjectSummaryDto,
  UpdateProjectDto,
} from "./projects/projects.dto.js";
import { WorkspaceStatusDto } from "./statuses/statuses.dto.js";
import {
  CreateTaskSkillDto,
  PreviewTaskSkillApplyDto,
  PreviewTaskSkillApplyOverridesDto,
  TaskSkillApplyPreviewDto,
  TaskSkillApplyPreviewSubtaskDto,
  TaskSkillApplyResultDto,
  TaskSkillDetailDto,
  TaskSkillSummaryDto,
  TaskSkillVersionSummaryDto,
  UpdateTaskSkillDefinitionDto,
  UpdateTaskSkillMetadataDto,
} from "./task-skills/task-skills.dto.js";
import {
  CreateTaskDto,
  TaskDetailDto,
  TaskSummaryDto,
  UpdateTaskAssigneeDto,
  UpdateTaskDto,
  UpdateTaskDueDateDto,
  UpdateTaskStatusDto,
} from "./tasks/tasks.dto.js";
import {
  ResolveTelegramContextDto,
  TelegramContextResolutionDto,
} from "./telegram/telegram.dto.js";
import {
  WorkspaceDetailDto,
  WorkspaceMemberDto,
  WorkspaceSummaryDto,
} from "./workspaces/workspaces.dto.js";

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("tAsk API")
    .setDescription("Backend API contract for tAsk.")
    .setVersion("0.0.0")
    .build();

  return SwaggerModule.createDocument(app, config, {
    extraModels: [
      HealthResponseDto,
      WorkspaceSummaryDto,
      WorkspaceMemberDto,
      WorkspaceDetailDto,
      CreateProjectDto,
      UpdateProjectDto,
      ProjectSummaryDto,
      ProjectDetailDto,
      WorkspaceStatusDto,
      CreateTaskSkillDto,
      PreviewTaskSkillApplyDto,
      PreviewTaskSkillApplyOverridesDto,
      TaskSkillApplyResultDto,
      TaskSkillApplyPreviewSubtaskDto,
      TaskSkillApplyPreviewDto,
      UpdateTaskSkillDefinitionDto,
      UpdateTaskSkillMetadataDto,
      TaskSkillSummaryDto,
      TaskSkillVersionSummaryDto,
      TaskSkillDetailDto,
      CreateTaskDto,
      UpdateTaskDto,
      UpdateTaskStatusDto,
      UpdateTaskAssigneeDto,
      UpdateTaskDueDateDto,
      TaskSummaryDto,
      TaskDetailDto,
      CreateTaskCommentDto,
      TaskCommentDto,
      CreateTaskLinkAttachmentDto,
      TaskAttachmentDto,
      ResolveTelegramContextDto,
      TelegramContextResolutionDto,
    ],
  });
}
