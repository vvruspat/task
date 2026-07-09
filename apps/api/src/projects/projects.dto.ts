import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectSummary,
  UpdateProjectInput,
} from "./projects.contracts.js";

const numericStringPattern = /^-?\d+(\.\d+)?$/;

export class CreateProjectDto implements CreateProjectInput {
  @ApiProperty({ example: "Album release", minLength: 1 })
  readonly title: string = "";

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: "active" })
  readonly status?: string | null;

  @ApiPropertyOptional({ nullable: true, pattern: numericStringPattern.source, type: String })
  readonly position?: string | null;
}

export class UpdateProjectDto implements UpdateProjectInput {
  @ApiPropertyOptional({ example: "Album release", minLength: 1 })
  readonly title?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: "active" })
  readonly status?: string | null;

  @ApiPropertyOptional({ nullable: true, pattern: numericStringPattern.source, type: String })
  readonly position?: string | null;
}

export class ParseCreateProjectBodyPipe implements PipeTransform<unknown, CreateProjectInput> {
  transform(value: unknown): CreateProjectInput {
    return parseCreateProjectInput(value);
  }
}

export class ParseUpdateProjectBodyPipe implements PipeTransform<unknown, UpdateProjectInput> {
  transform(value: unknown): UpdateProjectInput {
    return parseUpdateProjectInput(value);
  }
}

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

function parseCreateProjectInput(value: unknown): CreateProjectInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Project payload must be an object.");
  }

  const title = readRequiredNonEmptyString(value, "title");
  const description = readOptionalNullableString(value, "description");
  const status = readOptionalNullableString(value, "status");
  const position = readOptionalNullableString(value, "position");

  if (position !== undefined && position !== null && !numericStringPattern.test(position)) {
    throw new BadRequestException("Project position must be a numeric string.");
  }

  const input: CreateProjectInput = { title };

  if (description !== undefined) {
    input.description = description;
  }

  if (status !== undefined) {
    input.status = status;
  }

  if (position !== undefined) {
    input.position = position;
  }

  return input;
}

function parseUpdateProjectInput(value: unknown): UpdateProjectInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Project payload must be an object.");
  }

  const title = readOptionalNonEmptyString(value, "title");
  const description = readOptionalNullableString(value, "description");
  const status = readOptionalNullableString(value, "status");
  const position = readOptionalNullableString(value, "position");

  if (position !== undefined && position !== null && !numericStringPattern.test(position)) {
    throw new BadRequestException("Project position must be a numeric string.");
  }

  const input: UpdateProjectInput = {};

  if (title !== undefined) {
    input.title = title;
  }

  if (description !== undefined) {
    input.description = description;
  }

  if (status !== undefined) {
    input.status = status;
  }

  if (position !== undefined) {
    input.position = position;
  }

  if (Object.keys(input).length === 0) {
    throw new BadRequestException("Project update payload must include at least one field.");
  }

  return input;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredNonEmptyString(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Project ${propertyName} must be a string.`);
  }

  const trimmedValue = propertyValue.trim();

  if (trimmedValue.length === 0) {
    throw new BadRequestException(`Project ${propertyName} must not be empty.`);
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
    throw new BadRequestException(`Project ${propertyName} must be a string.`);
  }

  const trimmedValue = propertyValue.trim();

  if (trimmedValue.length === 0) {
    throw new BadRequestException(`Project ${propertyName} must not be empty.`);
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
    throw new BadRequestException(`Project ${propertyName} must be a string or null.`);
  }

  const trimmedValue = propertyValue.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}
