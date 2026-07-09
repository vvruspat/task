import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TaskDetailDto } from "../tasks/tasks.dto.js";
import type {
  CloneTaskSkillInput,
  CreateTaskSkillInput,
  PreviewTaskSkillApplyInput,
  PreviewTaskSkillApplyOverrides,
  TaskSkillApplyPreview,
  TaskSkillApplyPreviewSubtask,
  TaskSkillApplyPreviewSubtaskSource,
  TaskSkillApplyResult,
  TaskSkillDetail,
  TaskSkillSummary,
  TaskSkillVersionSummary,
  UpdateTaskSkillDefinitionInput,
  UpdateTaskSkillMetadataInput,
} from "./task-skills.contracts.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export class CloneTaskSkillDto implements CloneTaskSkillInput {
  @ApiProperty({ example: "Song copy", minLength: 1 })
  readonly name: string = "";

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description?: string | null;

  @ApiPropertyOptional({ isArray: true, type: String })
  readonly aliases?: string[];
}

export class ParseCloneTaskSkillBodyPipe implements PipeTransform<unknown, CloneTaskSkillInput> {
  transform(value: unknown): CloneTaskSkillInput {
    return parseCloneTaskSkillInput(value);
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

export class PreviewTaskSkillApplyOverridesDto implements PreviewTaskSkillApplyOverrides {
  @ApiPropertyOptional({ isArray: true, type: String })
  readonly removeSubtasks?: string[];

  @ApiPropertyOptional({ isArray: true, type: String })
  readonly addSubtasks?: string[];
}

export class PreviewTaskSkillApplyDto implements PreviewTaskSkillApplyInput {
  @ApiProperty({ format: "uuid" })
  readonly projectId: string = "";

  @ApiProperty({ example: "Intro", minLength: 1 })
  readonly rootTaskTitle: string = "";

  @ApiPropertyOptional({ type: PreviewTaskSkillApplyOverridesDto })
  readonly overrides?: PreviewTaskSkillApplyOverridesDto;
}

export class ParsePreviewTaskSkillApplyBodyPipe
  implements PipeTransform<unknown, PreviewTaskSkillApplyInput>
{
  transform(value: unknown): PreviewTaskSkillApplyInput {
    return parsePreviewTaskSkillApplyInput(value);
  }
}

export class TaskSkillApplyPreviewSubtaskDto implements TaskSkillApplyPreviewSubtask {
  @ApiProperty({ example: "Record vocals" })
  readonly title: string;

  @ApiProperty({ enum: ["skill", "added"] })
  readonly source: TaskSkillApplyPreviewSubtaskSource;

  constructor(subtask: TaskSkillApplyPreviewSubtask) {
    this.title = subtask.title;
    this.source = subtask.source;
  }
}

export class TaskSkillApplyPreviewDto implements TaskSkillApplyPreview {
  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ format: "uuid" })
  readonly projectId: string;

  @ApiProperty({ format: "uuid" })
  readonly taskSkillId: string;

  @ApiProperty({ format: "uuid" })
  readonly taskSkillVersionId: string;

  @ApiProperty({ example: 1 })
  readonly taskSkillVersion: number;

  @ApiProperty({ example: "Intro" })
  readonly rootTaskTitle: string;

  @ApiProperty({ isArray: true, type: TaskSkillApplyPreviewSubtaskDto })
  readonly subtasks: TaskSkillApplyPreviewSubtaskDto[];

  constructor(preview: TaskSkillApplyPreview) {
    this.workspaceId = preview.workspaceId;
    this.projectId = preview.projectId;
    this.taskSkillId = preview.taskSkillId;
    this.taskSkillVersionId = preview.taskSkillVersionId;
    this.taskSkillVersion = preview.taskSkillVersion;
    this.rootTaskTitle = preview.rootTaskTitle;
    this.subtasks = preview.subtasks.map((subtask) => new TaskSkillApplyPreviewSubtaskDto(subtask));
  }
}

export class TaskSkillApplyResultDto implements TaskSkillApplyResult {
  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ format: "uuid" })
  readonly projectId: string;

  @ApiProperty({ format: "uuid" })
  readonly taskSkillId: string;

  @ApiProperty({ format: "uuid" })
  readonly taskSkillVersionId: string;

  @ApiProperty({ example: 1 })
  readonly taskSkillVersion: number;

  @ApiProperty({ type: TaskDetailDto })
  readonly rootTask: TaskDetailDto;

  @ApiProperty({ isArray: true, type: TaskDetailDto })
  readonly subtasks: TaskDetailDto[];

  constructor(result: TaskSkillApplyResult) {
    this.workspaceId = result.workspaceId;
    this.projectId = result.projectId;
    this.taskSkillId = result.taskSkillId;
    this.taskSkillVersionId = result.taskSkillVersionId;
    this.taskSkillVersion = result.taskSkillVersion;
    this.rootTask = new TaskDetailDto(result.rootTask);
    this.subtasks = result.subtasks.map((subtask) => new TaskDetailDto(subtask));
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

function parseCloneTaskSkillInput(value: unknown): CloneTaskSkillInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task skill clone payload must be an object.");
  }

  const name = readRequiredNonEmptyString(value, "name");
  const description = readOptionalNullableString(value, "description");
  const aliases = readOptionalStringArray(value, "aliases");
  const input: CloneTaskSkillInput = {
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

function parsePreviewTaskSkillApplyInput(value: unknown): PreviewTaskSkillApplyInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task skill apply preview payload must be an object.");
  }

  const projectId = readRequiredUuid(value, "projectId");
  const rootTaskTitle = readRequiredNonEmptyString(value, "rootTaskTitle");
  const overrides = readOptionalPreviewOverrides(value, "overrides");
  const input: PreviewTaskSkillApplyInput = {
    projectId,
    rootTaskTitle,
  };

  if (overrides !== undefined) {
    input.overrides = overrides;
  }

  return input;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredUuid(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = readRequiredNonEmptyString(value, propertyName);

  if (!uuidV4Pattern.test(propertyValue)) {
    throw new BadRequestException(`Task skill ${propertyName} must be a UUID v4 string.`);
  }

  return propertyValue;
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

function readOptionalPreviewOverrides(
  value: Record<string, unknown>,
  propertyName: string,
): PreviewTaskSkillApplyOverrides | undefined {
  const propertyValue = value[propertyName];

  if (propertyValue === undefined) {
    return undefined;
  }

  if (!isUnknownRecord(propertyValue)) {
    throw new BadRequestException(`Task skill ${propertyName} must be an object.`);
  }

  const removeSubtasks = readOptionalStringArray(propertyValue, "removeSubtasks");
  const addSubtasks = readOptionalStringArray(propertyValue, "addSubtasks");
  const overrides: PreviewTaskSkillApplyOverrides = {};

  if (removeSubtasks !== undefined) {
    overrides.removeSubtasks = removeSubtasks;
  }

  if (addSubtasks !== undefined) {
    overrides.addSubtasks = addSubtasks;
  }

  return overrides;
}

function readRequiredDefinition(
  value: Record<string, unknown>,
  propertyName: string,
): Record<string, unknown> {
  const propertyValue = value[propertyName];

  if (!isUnknownRecord(propertyValue)) {
    throw new BadRequestException(`Task skill ${propertyName} must be an object.`);
  }

  const subtasks = readUnknownProperty(propertyValue, "subtasks");

  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    throw new BadRequestException("Task skill definition.subtasks must be a non-empty array.");
  }

  for (const subtask of subtasks) {
    if (!isUnknownRecord(subtask)) {
      throw new BadRequestException("Task skill definition.subtasks must contain objects.");
    }

    const title = readUnknownProperty(subtask, "title");

    if (typeof title !== "string" || title.trim().length === 0) {
      throw new BadRequestException("Task skill definition.subtasks titles must not be empty.");
    }
  }

  return propertyValue;
}

function readUnknownProperty(value: Record<string, unknown>, propertyName: string): unknown {
  return value[propertyName];
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
