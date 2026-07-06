import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { ProjectDetail, ProjectSummary } from "./projects.contracts.js";

export class ProjectSummaryDto implements ProjectSummary {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ example: "Album release" })
  readonly title: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: "active" })
  readonly status: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: "1000" })
  readonly position: string | null;

  @ApiProperty({ format: "uuid" })
  readonly createdByUserId: string;

  @ApiPropertyOptional({ format: "date-time", nullable: true, type: Date })
  readonly archivedAt: Date | null;

  @ApiProperty({ format: "date-time" })
  readonly createdAt: Date;

  @ApiProperty({ format: "date-time" })
  readonly updatedAt: Date;

  constructor(project: ProjectSummary) {
    this.id = project.id;
    this.workspaceId = project.workspaceId;
    this.title = project.title;
    this.description = project.description;
    this.status = project.status;
    this.position = project.position;
    this.createdByUserId = project.createdByUserId;
    this.archivedAt = project.archivedAt;
    this.createdAt = project.createdAt;
    this.updatedAt = project.updatedAt;
  }
}

export class ProjectDetailDto extends ProjectSummaryDto implements ProjectDetail {}
