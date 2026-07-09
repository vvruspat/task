import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CreateTaskInput,
  MoveTaskInput,
  TaskDetail,
  TaskSummary,
  UpdateTaskAssigneeInput,
  UpdateTaskDueDateInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from "./tasks.contracts.js";

const numericStringPattern = /^-?\d+(\.\d+)?$/;
const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CreateTaskDto implements CreateTaskInput {
  @ApiProperty({ example: "Record bass", minLength: 1 })
  readonly title: string = "";

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly parentTaskId?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description?: string | null;

  @ApiPropertyOptional({ nullable: true, pattern: numericStringPattern.source, type: String })
  readonly position?: string | null;

  @ApiPropertyOptional({ format: "date-time", nullable: true, type: String })
  readonly dueAt?: string | null;

  @ApiPropertyOptional({ additionalProperties: true, type: "object" })
  readonly metadata?: Record<string, unknown>;
}

export class ParseCreateTaskBodyPipe implements PipeTransform<unknown, CreateTaskInput> {
  transform(value: unknown): CreateTaskInput {
    return parseCreateTaskInput(value);
  }
}

export class UpdateTaskDto implements UpdateTaskInput {
  @ApiPropertyOptional({ example: "Record bass", minLength: 1 })
  readonly title?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description?: string | null;

  @ApiPropertyOptional({ additionalProperties: true, type: "object" })
  readonly metadata?: Record<string, unknown>;
}

export class ParseUpdateTaskBodyPipe implements PipeTransform<unknown, UpdateTaskInput> {
  transform(value: unknown): UpdateTaskInput {
    return parseUpdateTaskInput(value);
  }
}

export class MoveTaskDto implements MoveTaskInput {
  @ApiProperty({ format: "uuid", nullable: true, type: String })
  readonly parentTaskId: string | null = null;

  @ApiProperty({ example: "1000", pattern: numericStringPattern.source })
  readonly position: string = "0";
}

export class ParseMoveTaskBodyPipe implements PipeTransform<unknown, MoveTaskInput> {
  transform(value: unknown): MoveTaskInput {
    return parseMoveTaskInput(value);
  }
}

export class UpdateTaskStatusDto implements UpdateTaskStatusInput {
  @ApiProperty({ format: "uuid", nullable: true, type: String })
  readonly statusId: string | null = null;
}

export class ParseUpdateTaskStatusBodyPipe
  implements PipeTransform<unknown, UpdateTaskStatusInput>
{
  transform(value: unknown): UpdateTaskStatusInput {
    return parseUpdateTaskStatusInput(value);
  }
}

export class UpdateTaskAssigneeDto implements UpdateTaskAssigneeInput {
  @ApiProperty({ format: "uuid", nullable: true, type: String })
  readonly assigneeUserId: string | null = null;
}

export class ParseUpdateTaskAssigneeBodyPipe
  implements PipeTransform<unknown, UpdateTaskAssigneeInput>
{
  transform(value: unknown): UpdateTaskAssigneeInput {
    return parseUpdateTaskAssigneeInput(value);
  }
}

export class UpdateTaskDueDateDto implements UpdateTaskDueDateInput {
  @ApiProperty({ format: "date-time", nullable: true, type: String })
  readonly dueAt: string | null = null;
}

export class ParseUpdateTaskDueDateBodyPipe
  implements PipeTransform<unknown, UpdateTaskDueDateInput>
{
  transform(value: unknown): UpdateTaskDueDateInput {
    return parseUpdateTaskDueDateInput(value);
  }
}

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

function parseCreateTaskInput(value: unknown): CreateTaskInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task payload must be an object.");
  }

  const title = readRequiredNonEmptyString(value, "title");
  const parentTaskId = readOptionalNullableUuid(value, "parentTaskId");
  const description = readOptionalNullableString(value, "description");
  const position = readOptionalNullableString(value, "position");
  const dueAt = readOptionalNullableDateTime(value, "dueAt");
  const metadata = readOptionalRecord(value, "metadata");

  if (position !== undefined && position !== null && !numericStringPattern.test(position)) {
    throw new BadRequestException("Task position must be a numeric string.");
  }

  const input: CreateTaskInput = { title };

  if (parentTaskId !== undefined) {
    input.parentTaskId = parentTaskId;
  }

  if (description !== undefined) {
    input.description = description;
  }

  if (position !== undefined) {
    input.position = position;
  }

  if (dueAt !== undefined) {
    input.dueAt = dueAt;
  }

  if (metadata !== undefined) {
    input.metadata = metadata;
  }

  return input;
}

function parseUpdateTaskInput(value: unknown): UpdateTaskInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task payload must be an object.");
  }

  const title = readOptionalNonEmptyString(value, "title");
  const description = readOptionalNullableString(value, "description");
  const metadata = readOptionalRecord(value, "metadata");
  const input: UpdateTaskInput = {};

  if (title !== undefined) {
    input.title = title;
  }

  if (description !== undefined) {
    input.description = description;
  }

  if (metadata !== undefined) {
    input.metadata = metadata;
  }

  if (Object.keys(input).length === 0) {
    throw new BadRequestException("Task update payload must include at least one field.");
  }

  return input;
}

function parseMoveTaskInput(value: unknown): MoveTaskInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task move payload must be an object.");
  }

  const parentTaskId = readRequiredNullableUuid(value, "parentTaskId");
  const position = readRequiredNumericString(value, "position");

  return { parentTaskId, position };
}

function parseUpdateTaskStatusInput(value: unknown): UpdateTaskStatusInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task status payload must be an object.");
  }

  return {
    statusId: readRequiredNullableUuid(value, "statusId"),
  };
}

function parseUpdateTaskAssigneeInput(value: unknown): UpdateTaskAssigneeInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task assignee payload must be an object.");
  }

  return {
    assigneeUserId: readRequiredNullableUuid(value, "assigneeUserId"),
  };
}

function parseUpdateTaskDueDateInput(value: unknown): UpdateTaskDueDateInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task due date payload must be an object.");
  }

  return {
    dueAt: readRequiredNullableDateTime(value, "dueAt"),
  };
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredNonEmptyString(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Task ${propertyName} must be a string.`);
  }

  const trimmedValue = propertyValue.trim();

  if (trimmedValue.length === 0) {
    throw new BadRequestException(`Task ${propertyName} must not be empty.`);
  }

  return trimmedValue;
}

function readOptionalNonEmptyString(
  value: Record<string, unknown>,
  propertyName: string,
): string | undefined {
  const propertyValue = value[propertyName];

  if (propertyValue === undefined) {
    return undefined;
  }

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Task ${propertyName} must be a string.`);
  }

  const trimmedValue = propertyValue.trim();

  if (trimmedValue.length === 0) {
    throw new BadRequestException(`Task ${propertyName} must not be empty.`);
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
    throw new BadRequestException(`Task ${propertyName} must be a string or null.`);
  }

  const trimmedValue = propertyValue.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}

function readOptionalNullableUuid(
  value: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const propertyValue = readOptionalNullableString(value, propertyName);

  if (propertyValue === undefined || propertyValue === null) {
    return propertyValue;
  }

  if (!uuidV4Pattern.test(propertyValue)) {
    throw new BadRequestException(`Task ${propertyName} must be a UUID v4 string or null.`);
  }

  return propertyValue;
}

function readRequiredNullableUuid(
  value: Record<string, unknown>,
  propertyName: string,
): string | null {
  const propertyValue = value[propertyName];

  if (propertyValue === null) {
    return null;
  }

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Task ${propertyName} must be a UUID v4 string or null.`);
  }

  const trimmedValue = propertyValue.trim();

  if (!uuidV4Pattern.test(trimmedValue)) {
    throw new BadRequestException(`Task ${propertyName} must be a UUID v4 string or null.`);
  }

  return trimmedValue;
}

function readRequiredNumericString(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Task ${propertyName} must be a numeric string.`);
  }

  const trimmedValue = propertyValue.trim();

  if (!numericStringPattern.test(trimmedValue)) {
    throw new BadRequestException(`Task ${propertyName} must be a numeric string.`);
  }

  return trimmedValue;
}

function readRequiredNullableDateTime(
  value: Record<string, unknown>,
  propertyName: string,
): string | null {
  const propertyValue = value[propertyName];

  if (propertyValue === null) {
    return null;
  }

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Task ${propertyName} must be an ISO date-time string or null.`);
  }

  const trimmedValue = propertyValue.trim();
  const timestamp = Date.parse(trimmedValue);

  if (trimmedValue.length === 0 || !Number.isFinite(timestamp)) {
    throw new BadRequestException(`Task ${propertyName} must be an ISO date-time string or null.`);
  }

  return new Date(timestamp).toISOString();
}

function readOptionalNullableDateTime(
  value: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const propertyValue = readOptionalNullableString(value, propertyName);

  if (propertyValue === undefined || propertyValue === null) {
    return propertyValue;
  }

  const timestamp = Date.parse(propertyValue);

  if (!Number.isFinite(timestamp)) {
    throw new BadRequestException(`Task ${propertyName} must be an ISO date-time string or null.`);
  }

  return new Date(timestamp).toISOString();
}

function readOptionalRecord(
  value: Record<string, unknown>,
  propertyName: string,
): Record<string, unknown> | undefined {
  const propertyValue = value[propertyName];

  if (propertyValue === undefined) {
    return undefined;
  }

  if (!isUnknownRecord(propertyValue)) {
    throw new BadRequestException(`Task ${propertyName} must be an object.`);
  }

  return propertyValue;
}
