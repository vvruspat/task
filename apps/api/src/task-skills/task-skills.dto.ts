import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CreateTaskSkillInput,
  TaskSkillDetail,
  TaskSkillSummary,
  TaskSkillVersionSummary,
  UpdateTaskSkillDefinitionInput,
  UpdateTaskSkillMetadataInput,
} from "./task-skills.contracts.js";

export class CreateTaskSkillDto implements CreateTaskSkillInput {
  @ApiProperty({ example: "Song", minLength: 1 })
  readonly name: string = "";

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description?: string | null;

  @ApiPropertyOptional({ isArray: true, type: String })
  readonly aliases?: string[];

  @ApiProperty({ additionalProperties: true, type: "object" })
  readonly definition: Record<string, unknown> = {};
}

export class ParseCreateTaskSkillBodyPipe implements PipeTransform<unknown, CreateTaskSkillInput> {
  transform(value: unknown): CreateTaskSkillInput {
    return parseCreateTaskSkillInput(value);
  }
}

export class UpdateTaskSkillMetadataDto implements UpdateTaskSkillMetadataInput {
  @ApiPropertyOptional({ example: "Song", minLength: 1 })
  readonly name?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description?: string | null;

  @ApiPropertyOptional({ isArray: true, type: String })
  readonly aliases?: string[];
}

export class ParseUpdateTaskSkillMetadataBodyPipe
  implements PipeTransform<unknown, UpdateTaskSkillMetadataInput>
{
  transform(value: unknown): UpdateTaskSkillMetadataInput {
    return parseUpdateTaskSkillMetadataInput(value);
  }
}

export class UpdateTaskSkillDefinitionDto implements UpdateTaskSkillDefinitionInput {
  @ApiProperty({ additionalProperties: true, type: "object" })
  readonly definition: Record<string, unknown> = {};
}

export class ParseUpdateTaskSkillDefinitionBodyPipe
  implements PipeTransform<unknown, UpdateTaskSkillDefinitionInput>
{
  transform(value: unknown): UpdateTaskSkillDefinitionInput {
    return parseUpdateTaskSkillDefinitionInput(value);
  }
}

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

function parseCreateTaskSkillInput(value: unknown): CreateTaskSkillInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task skill payload must be an object.");
  }

  const name = readRequiredNonEmptyString(value, "name");
  const description = readOptionalNullableString(value, "description");
  const aliases = readOptionalStringArray(value, "aliases");
  const definition = readRequiredDefinition(value, "definition");
  const input: CreateTaskSkillInput = {
    definition,
    name,
  };

  if (description !== undefined) {
    input.description = description;
  }

  if (aliases !== undefined) {
    input.aliases = aliases;
  }

  return input;
}

function parseUpdateTaskSkillMetadataInput(value: unknown): UpdateTaskSkillMetadataInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task skill payload must be an object.");
  }

  const input: UpdateTaskSkillMetadataInput = {};

  if ("name" in value) {
    input.name = readRequiredNonEmptyString(value, "name");
  }

  if ("description" in value) {
    const description = readOptionalNullableString(value, "description");

    if (description !== undefined) {
      input.description = description;
    }
  }

  if ("aliases" in value) {
    const aliases = readOptionalStringArray(value, "aliases");

    if (aliases !== undefined) {
      input.aliases = aliases;
    }
  }

  if (input.name === undefined && input.description === undefined && input.aliases === undefined) {
    throw new BadRequestException("Task skill metadata payload must include a field to update.");
  }

  return input;
}

function parseUpdateTaskSkillDefinitionInput(value: unknown): UpdateTaskSkillDefinitionInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task skill payload must be an object.");
  }

  return {
    definition: readRequiredDefinition(value, "definition"),
  };
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredNonEmptyString(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Task skill ${propertyName} must be a string.`);
  }

  const trimmedValue = propertyValue.trim();

  if (trimmedValue.length === 0) {
    throw new BadRequestException(`Task skill ${propertyName} must not be empty.`);
  }

  return trimmedValue;
}

function readOptionalNullableString(
  value: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const propertyValue = value[propertyName];

  if (propertyValue === undefined || propertyValue === null) {
    return propertyValue;
  }

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Task skill ${propertyName} must be a string or null.`);
  }

  const trimmedValue = propertyValue.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}

function readOptionalStringArray(
  value: Record<string, unknown>,
  propertyName: string,
): string[] | undefined {
  const propertyValue = value[propertyName];

  if (propertyValue === undefined) {
    return undefined;
  }

  if (!Array.isArray(propertyValue)) {
    throw new BadRequestException(`Task skill ${propertyName} must be an array of strings.`);
  }

  const aliases = propertyValue.map((alias) => {
    if (typeof alias !== "string") {
      throw new BadRequestException(`Task skill ${propertyName} must be an array of strings.`);
    }

    const trimmedAlias = alias.trim();

    if (trimmedAlias.length === 0) {
      throw new BadRequestException(`Task skill ${propertyName} must not contain empty values.`);
    }

    return trimmedAlias;
  });

  return [...new Set(aliases)];
}

function readRequiredDefinition(
  value: Record<string, unknown>,
  propertyName: string,
): Record<string, unknown> {
  const propertyValue = value[propertyName];

  if (!isUnknownRecord(propertyValue)) {
    throw new BadRequestException(`Task skill ${propertyName} must be an object.`);
  }

  const subtasks = propertyValue["subtasks"];

  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    throw new BadRequestException("Task skill definition.subtasks must be a non-empty array.");
  }

  for (const subtask of subtasks) {
    if (!isUnknownRecord(subtask)) {
      throw new BadRequestException("Task skill definition.subtasks must contain objects.");
    }

    const title = subtask["title"];

    if (typeof title !== "string" || title.trim().length === 0) {
      throw new BadRequestException("Task skill definition.subtasks titles must not be empty.");
    }
  }

  return propertyValue;
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
