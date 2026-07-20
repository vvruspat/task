import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CreateSavedViewInput,
  SavedView,
  SavedViewDisplayProperty,
  SavedViewFilter,
  SavedViewFilterField,
  SavedViewFilterOperator,
  SavedViewGrouping,
  SavedViewLayout,
  SavedViewOrdering,
  SavedViewSettings,
  UpdateSavedViewInput,
} from "./views.contracts.js";
import {
  savedViewDisplayProperties,
  savedViewFilterFields,
  savedViewFilterOperators,
  savedViewGroupings,
  savedViewLayouts,
  savedViewOrderings,
} from "./views.contracts.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class SavedViewFilterDto implements SavedViewFilter {
  @ApiProperty({ enum: savedViewFilterFields })
  readonly field: SavedViewFilterField;

  @ApiProperty({ enum: savedViewFilterOperators })
  readonly operator: SavedViewFilterOperator;

  @ApiProperty({ nullable: true, type: String })
  readonly value: string | null;

  constructor(filter: SavedViewFilter) {
    this.field = filter.field;
    this.operator = filter.operator;
    this.value = filter.value;
  }
}

export class SavedViewSettingsDto implements SavedViewSettings {
  @ApiProperty({ enum: savedViewGroupings })
  readonly grouping: SavedViewGrouping;

  @ApiProperty({ enum: savedViewGroupings })
  readonly subGrouping: SavedViewGrouping;

  @ApiProperty({ enum: savedViewOrderings })
  readonly ordering: SavedViewOrdering;

  @ApiProperty({ enum: ["asc", "desc"] })
  readonly orderDirection: "asc" | "desc";

  @ApiProperty()
  readonly showSubtasks: boolean;

  @ApiProperty()
  readonly showEmptyGroups: boolean;

  @ApiProperty({ enum: savedViewDisplayProperties, isArray: true })
  readonly displayProperties: SavedViewDisplayProperty[];

  @ApiProperty({ isArray: true, type: SavedViewFilterDto })
  readonly filters: SavedViewFilterDto[];

  constructor(settings: SavedViewSettings) {
    this.grouping = settings.grouping;
    this.subGrouping = settings.subGrouping;
    this.ordering = settings.ordering;
    this.orderDirection = settings.orderDirection;
    this.showSubtasks = settings.showSubtasks;
    this.showEmptyGroups = settings.showEmptyGroups;
    this.displayProperties = settings.displayProperties;
    this.filters = settings.filters.map((filter) => new SavedViewFilterDto(filter));
  }
}

export class CreateSavedViewDto implements CreateSavedViewInput {
  @ApiProperty({ example: "Текущий спринт", minLength: 1 })
  readonly name: string = "";

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly projectId?: string | null;

  @ApiProperty({ enum: savedViewLayouts })
  readonly layout: SavedViewLayout = "list";

  @ApiProperty({ type: SavedViewSettingsDto })
  readonly settings: SavedViewSettings = new SavedViewSettingsDto(defaultSavedViewSettings);
}

export class UpdateSavedViewDto implements UpdateSavedViewInput {
  @ApiPropertyOptional({ minLength: 1 })
  readonly name?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly projectId?: string | null;

  @ApiPropertyOptional({ enum: savedViewLayouts })
  readonly layout?: SavedViewLayout;

  @ApiPropertyOptional({ type: SavedViewSettingsDto })
  readonly settings?: SavedViewSettings;
}

export class SavedViewDto implements SavedView {
  @ApiProperty({ format: "uuid" })
  readonly id: string;
  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;
  @ApiProperty({ format: "uuid" })
  readonly userId: string;
  @ApiProperty({ example: "current-sprint" })
  readonly slug: string;
  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly projectId: string | null;
  @ApiProperty()
  readonly name: string;
  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description: string | null;
  @ApiProperty({ enum: savedViewLayouts })
  readonly layout: SavedViewLayout;
  @ApiProperty({ type: SavedViewSettingsDto })
  readonly settings: SavedViewSettingsDto;
  @ApiProperty({ format: "date-time" })
  readonly createdAt: Date;
  @ApiProperty({ format: "date-time" })
  readonly updatedAt: Date;

  constructor(view: SavedView) {
    this.id = view.id;
    this.workspaceId = view.workspaceId;
    this.userId = view.userId;
    this.slug = view.slug;
    this.projectId = view.projectId;
    this.name = view.name;
    this.description = view.description;
    this.layout = view.layout;
    this.settings = new SavedViewSettingsDto(view.settings);
    this.createdAt = view.createdAt;
    this.updatedAt = view.updatedAt;
  }
}

export class ParseCreateSavedViewBodyPipe implements PipeTransform<unknown, CreateSavedViewInput> {
  transform(value: unknown): CreateSavedViewInput {
    const record = readRecord(value, "View payload must be an object.");
    return {
      name: readName(record["name"]),
      description: readNullableText(record["description"]),
      projectId: readNullableUuid(record["projectId"]),
      layout: readEnum(record["layout"], savedViewLayouts, "layout"),
      settings: parseSettings(record["settings"]),
    };
  }
}

export class ParseUpdateSavedViewBodyPipe implements PipeTransform<unknown, UpdateSavedViewInput> {
  transform(value: unknown): UpdateSavedViewInput {
    const record = readRecord(value, "View payload must be an object.");
    const input: UpdateSavedViewInput = {};
    if (record["name"] !== undefined) input.name = readName(record["name"]);
    if (record["description"] !== undefined)
      input.description = readNullableText(record["description"]);
    if (record["projectId"] !== undefined) input.projectId = readNullableUuid(record["projectId"]);
    if (record["layout"] !== undefined)
      input.layout = readEnum(record["layout"], savedViewLayouts, "layout");
    if (record["settings"] !== undefined) input.settings = parseSettings(record["settings"]);
    if (Object.keys(input).length === 0) {
      throw new BadRequestException("View update payload must include at least one field.");
    }
    return input;
  }
}

export const defaultSavedViewSettings: SavedViewSettings = {
  grouping: "status",
  subGrouping: "none",
  ordering: "manual",
  orderDirection: "asc",
  showSubtasks: true,
  showEmptyGroups: false,
  displayProperties: ["status", "project", "due_at"],
  filters: [],
};

function parseSettings(value: unknown): SavedViewSettings {
  const record = readRecord(value, "View settings must be an object.");
  if (!Array.isArray(record["displayProperties"])) {
    throw new BadRequestException("View displayProperties must be an array.");
  }
  const displayProperties = record["displayProperties"].map((property) =>
    readEnum(property, savedViewDisplayProperties, "display property"),
  );
  const filtersValue = record["filters"];
  if (filtersValue !== undefined && !Array.isArray(filtersValue)) {
    throw new BadRequestException("View filters must be an array.");
  }
  const filters = (filtersValue ?? []).map(parseFilter);
  if (filters.length > 20) throw new BadRequestException("View filters cannot exceed 20 items.");
  return {
    grouping: readEnum(record["grouping"], savedViewGroupings, "grouping"),
    subGrouping: readEnum(record["subGrouping"], savedViewGroupings, "subGrouping"),
    ordering: readEnum(record["ordering"], savedViewOrderings, "ordering"),
    orderDirection: readEnum(record["orderDirection"], ["asc", "desc"] as const, "orderDirection"),
    showSubtasks: readBoolean(record["showSubtasks"], "showSubtasks"),
    showEmptyGroups: readBoolean(record["showEmptyGroups"], "showEmptyGroups"),
    displayProperties: [...new Set(displayProperties)],
    filters,
  };
}

function parseFilter(value: unknown): SavedViewFilter {
  const record = readRecord(value, "View filter must be an object.");
  const field = readEnum(record["field"], savedViewFilterFields, "filter field");
  const operator = readEnum(record["operator"], savedViewFilterOperators, "filter operator");
  const rawValue = record["value"];

  if (["status", "assignee", "creator", "project", "template"].includes(field)) {
    if (operator !== "is" && operator !== "is_not") {
      throw new BadRequestException(`View ${field} filter has an unsupported operator.`);
    }
    if (rawValue !== "none" && (typeof rawValue !== "string" || !uuidV4Pattern.test(rawValue))) {
      throw new BadRequestException(`View ${field} filter value must be a UUID v4 or none.`);
    }
    return { field, operator, value: rawValue };
  }

  if (field === "due_date") {
    if (operator === "is_empty" || operator === "is_not_empty") {
      return { field, operator, value: null };
    }
    if (
      (operator !== "before" && operator !== "after") ||
      typeof rawValue !== "string" ||
      !datePattern.test(rawValue)
    ) {
      throw new BadRequestException("View due date filter must use before/after with a date.");
    }
    return { field, operator, value: rawValue };
  }

  if (
    (operator !== "contains" && operator !== "not_contains") ||
    typeof rawValue !== "string" ||
    rawValue.trim().length === 0 ||
    rawValue.trim().length > 200
  ) {
    throw new BadRequestException("View content filter must contain 1 to 200 characters.");
  }
  return { field, operator, value: rawValue.trim() };
}

function readRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException(message);
  }
  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readName(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestException("View name must be a non-empty string.");
  }
  return value.trim();
}

function readNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string")
    throw new BadRequestException("View description must be a string or null.");
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function readNullableUuid(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !uuidV4Pattern.test(value)) {
    throw new BadRequestException("View projectId must be a UUID v4 or null.");
  }
  return value;
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new BadRequestException(`View ${field} must be a boolean.`);
  return value;
}

function readEnum<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  field: string,
): TValue {
  const matchingValue =
    typeof value === "string" ? allowed.find((item) => item === value) : undefined;
  if (matchingValue === undefined) {
    throw new BadRequestException(`View ${field} has an unsupported value.`);
  }
  return matchingValue;
}
