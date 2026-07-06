import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { TaskDetail, TaskSummary } from "./tasks.contracts.js";

export class TaskSummaryDto implements TaskSummary {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ format: "uuid" })
  readonly projectId: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly parentTaskId: string | null;

  @ApiProperty({ example: "Record bass" })
  readonly title: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly statusId: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly assigneeUserId: string | null;

  @ApiProperty({ format: "uuid" })
  readonly createdByUserId: string;

  @ApiProperty({ example: "1000" })
  readonly position: string;

  @ApiPropertyOptional({ format: "date-time", nullable: true, type: Date })
  readonly dueAt: Date | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly sourceSkillId: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly sourceSkillVersionId: string | null;

  @ApiProperty({ additionalProperties: true, type: "object" })
  readonly metadata: Record<string, unknown>;

  @ApiPropertyOptional({ format: "date-time", nullable: true, type: Date })
  readonly archivedAt: Date | null;

  @ApiProperty({ format: "date-time" })
  readonly createdAt: Date;

  @ApiProperty({ format: "date-time" })
  readonly updatedAt: Date;

  constructor(task: TaskSummary) {
    this.id = task.id;
    this.workspaceId = task.workspaceId;
    this.projectId = task.projectId;
    this.parentTaskId = task.parentTaskId;
    this.title = task.title;
    this.description = task.description;
    this.statusId = task.statusId;
    this.assigneeUserId = task.assigneeUserId;
    this.createdByUserId = task.createdByUserId;
    this.position = task.position;
    this.dueAt = task.dueAt;
    this.sourceSkillId = task.sourceSkillId;
    this.sourceSkillVersionId = task.sourceSkillVersionId;
    this.metadata = task.metadata;
    this.archivedAt = task.archivedAt;
    this.createdAt = task.createdAt;
    this.updatedAt = task.updatedAt;
  }
}

export class TaskDetailDto extends TaskSummaryDto implements TaskDetail {}
