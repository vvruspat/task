import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { type ParsedIssueIdentifier, parseIssueIdentifier } from "./issue-identifier.js";
import type {
  AddTaskSubtaskInput,
  AddTaskSubtasksInput,
  BulkUpdateTasksInput,
  CreateTaskInput,
  ListTaskTableInput,
  MoveTaskInput,
  TaskDetail,
  TaskSummary,
  TaskTablePage,
  UpdateTaskAssigneeInput,
  UpdateTaskDueDateInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from "./tasks.contracts.js";

const numericStringPattern = /^-?\d+(\.\d+)?$/;

export class ParseIssueIdentifierParamPipe implements PipeTransform<string, ParsedIssueIdentifier> {
  transform(value: string): ParsedIssueIdentifier {
    const parsed = parseIssueIdentifier(value);
    if (parsed === null) {
      throw new BadRequestException("Issue identifier must look like PROJ-123.");
    }
    return parsed;
  }
}
const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CreateTaskDto implements CreateTaskInput {
  @ApiProperty({ example: "Record bass", minLength: 1 })
  readonly title: string = "";

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly assigneeUserId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly statusId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly parentTaskId?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    pattern: numericStringPattern.source,
    type: String,
  })
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

export class AddTaskSubtaskDto implements AddTaskSubtaskInput {
  @ApiProperty({ example: "Record bass", minLength: 1 })
  readonly title: string = "";

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    pattern: numericStringPattern.source,
    type: String,
  })
  readonly position?: string | null;

  @ApiPropertyOptional({ format: "date-time", nullable: true, type: String })
  readonly dueAt?: string | null;

  @ApiPropertyOptional({ additionalProperties: true, type: "object" })
  readonly metadata?: Record<string, unknown>;
}

export class AddTaskSubtasksDto implements AddTaskSubtasksInput {
  @ApiProperty({ isArray: true, minItems: 1, type: AddTaskSubtaskDto })
  readonly subtasks: AddTaskSubtaskDto[] = [];
}

export class ParseAddTaskSubtasksBodyPipe implements PipeTransform<unknown, AddTaskSubtasksInput> {
  transform(value: unknown): AddTaskSubtasksInput {
    return parseAddTaskSubtasksInput(value);
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

  @ApiPropertyOptional({
    example: "1000",
    pattern: numericStringPattern.source,
    type: String,
  })
  readonly position?: string;
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

export class ListTaskTableQueryDto implements ListTaskTableInput {
  @ApiPropertyOptional({ minLength: 1, maxLength: 200 })
  readonly search?: string;
  @ApiPropertyOptional({ format: "uuid", type: String })
  readonly statusId?: string;
  @ApiPropertyOptional({ enum: ["unassigned"] })
  readonly statusFilter?: "unassigned";
  @ApiPropertyOptional({ format: "uuid", type: String })
  readonly assigneeUserId?: string;
  @ApiPropertyOptional({ enum: ["unassigned"] })
  readonly assigneeFilter?: "unassigned";
  @ApiPropertyOptional({ format: "date-time" }) readonly dueFrom?: string;
  @ApiPropertyOptional({ format: "date-time" }) readonly dueTo?: string;
  @ApiPropertyOptional({
    enum: ["title", "status", "assignee", "dueAt", "createdAt", "updatedAt"],
    default: "updatedAt",
  })
  readonly sortBy: "title" | "status" | "assignee" | "dueAt" | "createdAt" | "updatedAt" =
    "updatedAt";
  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  readonly sortDirection: "asc" | "desc" = "desc";
  @ApiPropertyOptional({ minimum: 1, default: 1 }) readonly page: number = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  readonly pageSize: number = 50;
}

export class ParseListTaskTableQueryPipe implements PipeTransform<unknown, ListTaskTableInput> {
  transform(value: unknown): ListTaskTableInput {
    if (!isUnknownRecord(value))
      throw new BadRequestException("Task table query must be an object.");
    const optionalUuid = (key: string): string | undefined => {
      const raw = value[key];
      if (raw === undefined) return undefined;
      if (typeof raw !== "string" || !uuidV4Pattern.test(raw.trim()))
        throw new BadRequestException(`${key} must be a UUID v4 string.`);
      return raw.trim();
    };
    const optionalDate = (key: string): string | undefined => {
      const raw = value[key];
      if (raw === undefined) return undefined;
      if (typeof raw !== "string" || raw.trim() === "" || !Number.isFinite(Date.parse(raw)))
        throw new BadRequestException(`${key} must be an ISO date-time string.`);
      return new Date(Date.parse(raw)).toISOString();
    };
    const positive = (key: string, fallback: number, maximum: number): number => {
      const raw = value[key];
      if (raw === undefined) return fallback;
      if (typeof raw !== "string" || !/^\d+$/.test(raw))
        throw new BadRequestException(`${key} must be a positive integer.`);
      const parsed = Number(raw);
      if (parsed < 1 || parsed > maximum)
        throw new BadRequestException(`${key} must be between 1 and ${maximum}.`);
      return parsed;
    };
    const sortByRaw = readUnknownProperty(value, "sortBy");
    const sortBy = sortByRaw === undefined ? "updatedAt" : sortByRaw;
    if (!isTaskTableSortField(sortBy)) throw new BadRequestException("sortBy is invalid.");
    const sortDirectionRaw = readUnknownProperty(value, "sortDirection");
    const sortDirection = sortDirectionRaw === undefined ? "desc" : sortDirectionRaw;
    if (sortDirection !== "asc" && sortDirection !== "desc")
      throw new BadRequestException("sortDirection must be asc or desc.");
    const input: ListTaskTableInput = {
      sortBy,
      sortDirection,
      page: positive("page", 1, Number.MAX_SAFE_INTEGER),
      pageSize: positive("pageSize", 50, 100),
    };
    const search = readUnknownProperty(value, "search");
    if (search !== undefined) {
      if (typeof search !== "string" || search.trim().length === 0 || search.trim().length > 200)
        throw new BadRequestException(
          "search must be a non-empty string no longer than 200 characters.",
        );
      input.search = search.trim();
    }
    const statusId = optionalUuid("statusId");
    const assigneeUserId = optionalUuid("assigneeUserId");
    const statusFilter = readUnknownProperty(value, "statusFilter");
    const assigneeFilter = readUnknownProperty(value, "assigneeFilter");
    if (statusFilter !== undefined && statusFilter !== "unassigned")
      throw new BadRequestException("statusFilter must be unassigned.");
    if (assigneeFilter !== undefined && assigneeFilter !== "unassigned")
      throw new BadRequestException("assigneeFilter must be unassigned.");
    if (statusId !== undefined && statusFilter !== undefined)
      throw new BadRequestException("statusId and statusFilter cannot be combined.");
    if (assigneeUserId !== undefined && assigneeFilter !== undefined)
      throw new BadRequestException("assigneeUserId and assigneeFilter cannot be combined.");
    const dueFrom = optionalDate("dueFrom");
    const dueTo = optionalDate("dueTo");
    if (dueFrom !== undefined && dueTo !== undefined && dueFrom > dueTo)
      throw new BadRequestException("dueFrom must not be after dueTo.");
    if (statusId !== undefined) input.statusId = statusId;
    if (statusFilter !== undefined) input.statusFilter = statusFilter;
    if (assigneeUserId !== undefined) input.assigneeUserId = assigneeUserId;
    if (assigneeFilter !== undefined) input.assigneeFilter = assigneeFilter;
    if (dueFrom !== undefined) input.dueFrom = dueFrom;
    if (dueTo !== undefined) input.dueTo = dueTo;
    return input;
  }
}

export class BulkUpdateTasksDto implements BulkUpdateTasksInput {
  @ApiProperty({
    isArray: true,
    minItems: 1,
    maxItems: 100,
    format: "uuid",
    type: String,
  })
  readonly taskIds: string[] = [];
  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly statusId?: string | null;
  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly assigneeUserId?: string | null;
  @ApiPropertyOptional({ format: "date-time", nullable: true, type: String })
  readonly dueAt?: string | null;
}

export class ParseBulkUpdateTasksBodyPipe implements PipeTransform<unknown, BulkUpdateTasksInput> {
  transform(value: unknown): BulkUpdateTasksInput {
    if (!isUnknownRecord(value))
      throw new BadRequestException("Task bulk update payload must be an object.");
    const rawTaskIds = readUnknownProperty(value, "taskIds");
    if (!Array.isArray(rawTaskIds) || rawTaskIds.length === 0 || rawTaskIds.length > 100)
      throw new BadRequestException("taskIds must contain between 1 and 100 UUID v4 strings.");
    const taskIds = rawTaskIds.map((taskId) => {
      if (typeof taskId !== "string" || !uuidV4Pattern.test(taskId.trim()))
        throw new BadRequestException("taskIds must contain UUID v4 strings.");
      return taskId.trim();
    });
    if (new Set(taskIds).size !== taskIds.length)
      throw new BadRequestException("taskIds must not contain duplicates.");
    const statusId = readOptionalNullableUuid(value, "statusId");
    const assigneeUserId = readOptionalNullableUuid(value, "assigneeUserId");
    const dueAt = readOptionalNullableDateTime(value, "dueAt");
    if (statusId === undefined && assigneeUserId === undefined && dueAt === undefined)
      throw new BadRequestException("Task bulk update payload must include at least one field.");
    const input: BulkUpdateTasksInput = { taskIds };
    if (statusId !== undefined) input.statusId = statusId;
    if (assigneeUserId !== undefined) input.assigneeUserId = assigneeUserId;
    if (dueAt !== undefined) input.dueAt = dueAt;
    return input;
  }
}

export class TaskSummaryDto implements TaskSummary {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ format: "uuid" })
  readonly projectId: string;

  @ApiProperty({ example: 42, minimum: 1 })
  readonly number: number;

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

  @ApiPropertyOptional({ example: 3, minimum: 0 })
  readonly commentCount?: number;

  constructor(task: TaskSummary) {
    this.id = task.id;
    this.workspaceId = task.workspaceId;
    this.projectId = task.projectId;
    this.number = task.number;
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
    if (task.commentCount !== undefined) this.commentCount = task.commentCount;
  }
}

export class TaskDetailDto extends TaskSummaryDto implements TaskDetail {}

export class TaskTablePageDto implements TaskTablePage {
  @ApiProperty({ type: TaskSummaryDto, isArray: true })
  readonly items: TaskSummaryDto[];
  @ApiProperty({ minimum: 1 }) readonly page: number;
  @ApiProperty({ minimum: 1, maximum: 100 }) readonly pageSize: number;
  @ApiProperty({ minimum: 0 }) readonly total: number;
  constructor(value: TaskTablePage) {
    this.items = value.items.map((task) => new TaskSummaryDto(task));
    this.page = value.page;
    this.pageSize = value.pageSize;
    this.total = value.total;
  }
}

function parseCreateTaskInput(value: unknown): CreateTaskInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task payload must be an object.");
  }

  const title = readRequiredNonEmptyString(value, "title");
  const assigneeUserId = readOptionalNullableUuid(value, "assigneeUserId");
  const statusId = readOptionalNullableUuid(value, "statusId");
  const parentTaskId = readOptionalNullableUuid(value, "parentTaskId");
  const description = readOptionalNullableString(value, "description");
  const position = readOptionalNullableString(value, "position");
  const dueAt = readOptionalNullableDateTime(value, "dueAt");
  const metadata = readOptionalRecord(value, "metadata");

  if (position !== undefined && position !== null && !numericStringPattern.test(position)) {
    throw new BadRequestException("Task position must be a numeric string.");
  }

  const input: CreateTaskInput = { title };

  if (assigneeUserId !== undefined) {
    input.assigneeUserId = assigneeUserId;
  }

  if (statusId !== undefined) {
    input.statusId = statusId;
  }

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

function parseAddTaskSubtasksInput(value: unknown): AddTaskSubtasksInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task subtasks payload must be an object.");
  }

  const subtasks = readUnknownProperty(value, "subtasks");

  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    throw new BadRequestException("Task subtasks payload must include at least one subtask.");
  }

  return {
    subtasks: subtasks.map(parseAddTaskSubtaskInput),
  };
}

function parseAddTaskSubtaskInput(value: unknown): AddTaskSubtaskInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Task subtask payloads must be objects.");
  }

  const title = readRequiredNonEmptyString(value, "title");
  const description = readOptionalNullableString(value, "description");
  const position = readOptionalNullableString(value, "position");
  const dueAt = readOptionalNullableDateTime(value, "dueAt");
  const metadata = readOptionalRecord(value, "metadata");

  if (position !== undefined && position !== null && !numericStringPattern.test(position)) {
    throw new BadRequestException("Task position must be a numeric string.");
  }

  const input: AddTaskSubtaskInput = { title };

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

  const statusId = readRequiredNullableUuid(value, "statusId");
  const position = readOptionalNullableString(value, "position");

  if (position === null || (position !== undefined && !numericStringPattern.test(position))) {
    throw new BadRequestException("Task position must be a numeric string when provided.");
  }

  return position === undefined ? { statusId } : { statusId, position };
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

function isTaskTableSortField(
  value: unknown,
): value is "title" | "status" | "assignee" | "dueAt" | "createdAt" | "updatedAt" {
  return (
    value === "title" ||
    value === "status" ||
    value === "assignee" ||
    value === "dueAt" ||
    value === "createdAt" ||
    value === "updatedAt"
  );
}

function readUnknownProperty(value: Record<string, unknown>, propertyName: string): unknown {
  return value[propertyName];
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
