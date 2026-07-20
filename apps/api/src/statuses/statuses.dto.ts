import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CreateWorkspaceStatusInput,
  ReorderWorkspaceStatusesInput,
  UpdateWorkspaceStatusInput,
  WorkspaceStatus,
} from "./statuses.contracts.js";

const numericStringPattern = /^-?\d+(\.\d+)?$/;
const hexColorPattern = /^#[0-9a-f]{6}$/i;
const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ReorderWorkspaceStatusesDto implements ReorderWorkspaceStatusesInput {
  @ApiProperty({ format: "uuid", isArray: true, minItems: 1, type: String, uniqueItems: true })
  readonly statusIds: string[] = [];
}

export class ParseReorderWorkspaceStatusesBodyPipe
  implements PipeTransform<unknown, ReorderWorkspaceStatusesInput>
{
  transform(value: unknown): ReorderWorkspaceStatusesInput {
    if (!isUnknownRecord(value) || !Array.isArray(value["statusIds"])) {
      throw new BadRequestException("Status order must include statusIds.");
    }
    const statusIds = value["statusIds"];
    if (
      statusIds.length === 0 ||
      !statusIds.every(
        (statusId): statusId is string =>
          typeof statusId === "string" && uuidV4Pattern.test(statusId),
      ) ||
      new Set(statusIds).size !== statusIds.length
    ) {
      throw new BadRequestException("Status order must contain unique UUIDs.");
    }
    return { statusIds };
  }
}

export class CreateWorkspaceStatusDto implements CreateWorkspaceStatusInput {
  @ApiProperty({ example: "In progress", minLength: 1 })
  readonly name: string = "";

  @ApiProperty({ example: "#3b82f6", pattern: hexColorPattern.source })
  readonly color: string = "";

  @ApiProperty({ example: "1000", pattern: numericStringPattern.source })
  readonly position: string = "";

  @ApiPropertyOptional({ example: false })
  readonly isDone?: boolean;
}

export class UpdateWorkspaceStatusDto implements UpdateWorkspaceStatusInput {
  @ApiPropertyOptional({ example: "In progress", minLength: 1 })
  readonly name?: string;

  @ApiPropertyOptional({ example: "#3b82f6", pattern: hexColorPattern.source })
  readonly color?: string;

  @ApiPropertyOptional({ example: "1000", pattern: numericStringPattern.source })
  readonly position?: string;

  @ApiPropertyOptional({ example: false })
  readonly isDone?: boolean;
}

export class ParseCreateWorkspaceStatusBodyPipe
  implements PipeTransform<unknown, CreateWorkspaceStatusInput>
{
  transform(value: unknown): CreateWorkspaceStatusInput {
    const input = parseStatusInput(value, true);

    if (input.name === undefined || input.color === undefined || input.position === undefined) {
      throw new BadRequestException("Status payload must include name, color, and position.");
    }

    return { ...input, name: input.name, color: input.color, position: input.position };
  }
}

export class ParseUpdateWorkspaceStatusBodyPipe
  implements PipeTransform<unknown, UpdateWorkspaceStatusInput>
{
  transform(value: unknown): UpdateWorkspaceStatusInput {
    const input = parseStatusInput(value, false);
    if (Object.keys(input).length === 0) {
      throw new BadRequestException("Status payload must include at least one field.");
    }
    return input;
  }
}

export class WorkspaceStatusDto implements WorkspaceStatus {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ format: "uuid" })
  readonly projectId: string;

  @ApiProperty({ example: "In progress" })
  readonly name: string;

  @ApiProperty({ example: "#3b82f6" })
  readonly color: string;

  @ApiProperty({ example: "1000" })
  readonly position: string;

  @ApiProperty({ example: false })
  readonly isDone: boolean;

  @ApiProperty({ format: "date-time" })
  readonly createdAt: Date;

  @ApiProperty({ format: "date-time" })
  readonly updatedAt: Date;

  constructor(status: WorkspaceStatus) {
    this.id = status.id;
    this.workspaceId = status.workspaceId;
    this.projectId = status.projectId;
    this.name = status.name;
    this.color = status.color;
    this.position = status.position;
    this.isDone = status.isDone;
    this.createdAt = status.createdAt;
    this.updatedAt = status.updatedAt;
  }
}

function parseStatusInput(
  value: unknown,
  requireFields: boolean,
): CreateWorkspaceStatusInput | UpdateWorkspaceStatusInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Status payload must be an object.");
  }

  const input: UpdateWorkspaceStatusInput = {};
  const name = readOptionalNonEmptyString(value, "name");
  const color = readOptionalNonEmptyString(value, "color");
  const position = readOptionalNonEmptyString(value, "position");
  const isDone = readOptionalBoolean(value, "isDone");

  if (position !== undefined && !numericStringPattern.test(position)) {
    throw new BadRequestException("Status position must be a numeric string.");
  }
  if (color !== undefined && !hexColorPattern.test(color)) {
    throw new BadRequestException("Status color must be a six-digit hex color.");
  }

  if (name !== undefined) input.name = name;
  if (color !== undefined) input.color = color;
  if (position !== undefined) input.position = position;
  if (isDone !== undefined) input.isDone = isDone;

  if (requireFields && Object.keys(input).length !== 3 && Object.keys(input).length !== 4) {
    throw new BadRequestException("Status payload must include name, color, and position.");
  }

  return input;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalNonEmptyString(
  value: Record<string, unknown>,
  key: string,
): string | undefined {
  if (!(key in value)) return undefined;
  const field = value[key];
  if (typeof field !== "string" || field.trim().length === 0) {
    throw new BadRequestException(`Status ${key} must be a non-empty string.`);
  }
  return field;
}

function readOptionalBoolean(value: Record<string, unknown>, key: string): boolean | undefined {
  if (!(key in value)) return undefined;
  const field = value[key];
  if (typeof field !== "boolean") {
    throw new BadRequestException("Status isDone must be a boolean.");
  }
  return field;
}
