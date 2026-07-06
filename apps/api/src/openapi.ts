import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { HealthResponseDto } from "./app.dto.js";
import { CreateProjectDto, ProjectDetailDto, ProjectSummaryDto } from "./projects/projects.dto.js";
import { CreateTaskDto, TaskDetailDto, TaskSummaryDto } from "./tasks/tasks.dto.js";
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
      ProjectSummaryDto,
      ProjectDetailDto,
      CreateTaskDto,
      TaskSummaryDto,
      TaskDetailDto,
    ],
  });
}
