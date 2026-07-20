import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { HealthResponseDto } from "./app.dto.js";
import {
  CreateTaskFileAttachmentDto,
  CreateTaskLinkAttachmentDto,
  CreateTaskTelegramFileAttachmentDto,
  TaskAttachmentDto,
} from "./attachments/attachments.dto.js";
import {
  AuthSessionDto,
  AuthSessionInfoDto,
  AuthUserDto,
  LoginDto,
  RegisterDto,
} from "./auth/auth.dto.js";
import { CreateTaskCommentDto, TaskCommentDto } from "./comments/comments.dto.js";
import {
  ProjectMatrixCellDto,
  ProjectMatrixDto,
  ProjectMatrixStageDto,
} from "./project-matrix/project-matrix.dto.js";
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
  BulkUpdateTasksDto,
  CreateTaskDto,
  ListTaskTableQueryDto,
  TaskDetailDto,
  TaskSummaryDto,
  TaskTablePageDto,
  UpdateTaskAssigneeDto,
  UpdateTaskDto,
  UpdateTaskDueDateDto,
  UpdateTaskStatusDto,
} from "./tasks/tasks.dto.js";
import {
  LinkedTelegramIdentityDto,
  ResolveTelegramContextDto,
  TelegramContextResolutionDto,
  VerifiedTelegramMiniAppInitDataDto,
  VerifyTelegramMiniAppInitDataDto,
} from "./telegram/telegram.dto.js";
import {
  UpdateWorkspaceDto,
  WorkspaceDetailDto,
  WorkspaceMemberDto,
  WorkspaceSummaryDto,
} from "./workspaces/workspaces.dto.js";

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("tAsk API")
    .setDescription("Backend API contract for tAsk.")
    .setVersion("0.0.0")
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config, {
    extraModels: [
      HealthResponseDto,
      RegisterDto,
      LoginDto,
      AuthUserDto,
      AuthSessionDto,
      AuthSessionInfoDto,
      WorkspaceSummaryDto,
      WorkspaceMemberDto,
      WorkspaceDetailDto,
      UpdateWorkspaceDto,
      CreateProjectDto,
      UpdateProjectDto,
      ProjectSummaryDto,
      ProjectDetailDto,
      ProjectMatrixStageDto,
      ProjectMatrixCellDto,
      ProjectMatrixDto,
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
      BulkUpdateTasksDto,
      ListTaskTableQueryDto,
      UpdateTaskDto,
      UpdateTaskStatusDto,
      UpdateTaskAssigneeDto,
      UpdateTaskDueDateDto,
      TaskSummaryDto,
      TaskDetailDto,
      TaskTablePageDto,
      CreateTaskCommentDto,
      TaskCommentDto,
      CreateTaskFileAttachmentDto,
      CreateTaskLinkAttachmentDto,
      CreateTaskTelegramFileAttachmentDto,
      TaskAttachmentDto,
      ResolveTelegramContextDto,
      TelegramContextResolutionDto,
      VerifyTelegramMiniAppInitDataDto,
      VerifiedTelegramMiniAppInitDataDto,
      LinkedTelegramIdentityDto,
    ],
  });
}
