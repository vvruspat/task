import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  TaskSkillDetail,
  TaskSkillSummary,
  TaskSkillVersionSummary,
} from "./task-skills.contracts.js";

export class TaskSkillSummaryDto implements TaskSkillSummary {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ example: "Song" })
  readonly name: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description: string | null;

  @ApiProperty({ isArray: true, type: String })
  readonly aliases: string[];

  @ApiProperty({ format: "uuid" })
  readonly createdByUserId: string;

  @ApiPropertyOptional({ format: "date-time", nullable: true, type: Date })
  readonly archivedAt: Date | null;

  @ApiProperty({ format: "date-time" })
  readonly createdAt: Date;

  @ApiProperty({ format: "date-time" })
  readonly updatedAt: Date;

  constructor(skill: TaskSkillSummary) {
    this.id = skill.id;
    this.workspaceId = skill.workspaceId;
    this.name = skill.name;
    this.description = skill.description;
    this.aliases = skill.aliases;
    this.createdByUserId = skill.createdByUserId;
    this.archivedAt = skill.archivedAt;
    this.createdAt = skill.createdAt;
    this.updatedAt = skill.updatedAt;
  }
}

export class TaskSkillVersionSummaryDto implements TaskSkillVersionSummary {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ format: "uuid" })
  readonly taskSkillId: string;

  @ApiProperty({ example: 1 })
  readonly version: number;

  @ApiProperty({ additionalProperties: true, type: "object" })
  readonly definition: Record<string, unknown>;

  @ApiProperty({ format: "uuid" })
  readonly createdByUserId: string;

  @ApiProperty({ format: "date-time" })
  readonly createdAt: Date;

  constructor(version: TaskSkillVersionSummary) {
    this.id = version.id;
    this.workspaceId = version.workspaceId;
    this.taskSkillId = version.taskSkillId;
    this.version = version.version;
    this.definition = version.definition;
    this.createdByUserId = version.createdByUserId;
    this.createdAt = version.createdAt;
  }
}

export class TaskSkillDetailDto extends TaskSkillSummaryDto implements TaskSkillDetail {
  @ApiProperty({ isArray: true, type: TaskSkillVersionSummaryDto })
  readonly versions: TaskSkillVersionSummaryDto[];

  constructor(skill: TaskSkillDetail) {
    super(skill);
    this.versions = skill.versions.map((version) => new TaskSkillVersionSummaryDto(version));
  }
}
