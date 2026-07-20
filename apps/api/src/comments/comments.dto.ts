import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { CreateTaskCommentInput, TaskComment } from "./comments.contracts.js";

export class CreateTaskCommentDto implements CreateTaskCommentInput {
  @ApiProperty({ example: "Bass take is ready for review.", minLength: 1 })
  readonly body: string = "";

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly parentCommentId: string | null = null;

  @ApiPropertyOptional({ format: "uuid", isArray: true, type: String })
  readonly mentionedUserIds?: string[] = [];
}

export class ParseCreateTaskCommentBodyPipe
  implements PipeTransform<unknown, CreateTaskCommentInput>
{
  transform(value: unknown): CreateTaskCommentInput {
    return parseCreateTaskCommentInput(value);
  }
}

export class TaskCommentDto implements TaskComment {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ format: "uuid" })
  readonly taskId: string;

  @ApiProperty({ format: "uuid" })
  readonly authorUserId: string;

  @ApiProperty({ format: "uuid", nullable: true, type: String })
  readonly agentRunId: string | null;

  @ApiProperty({ format: "uuid", nullable: true, type: String })
  readonly parentCommentId: string | null;

  @ApiProperty({ format: "uuid", isArray: true, type: String })
  readonly mentionedUserIds: string[];

  @ApiProperty({ example: "Bass take is ready for review." })
  readonly body: string;

  @ApiProperty({ format: "date-time" })
  readonly createdAt: Date;

  @ApiProperty({ format: "date-time" })
  readonly updatedAt: Date;

  constructor(comment: TaskComment) {
    this.id = comment.id;
    this.workspaceId = comment.workspaceId;
    this.taskId = comment.taskId;
    this.authorUserId = comment.authorUserId;
    this.agentRunId = comment.agentRunId;
    this.parentCommentId = comment.parentCommentId;
    this.mentionedUserIds = comment.mentionedUserIds;
    this.body = comment.body;
    this.createdAt = comment.createdAt;
    this.updatedAt = comment.updatedAt;
  }
}

function parseCreateTaskCommentInput(value: unknown): CreateTaskCommentInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Comment payload must be an object.");
  }

  return {
    body: readRequiredNonEmptyString(value, "body"),
    parentCommentId: readOptionalNullableUuid(value, "parentCommentId"),
    mentionedUserIds: readOptionalUuidArray(value, "mentionedUserIds"),
  };
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredNonEmptyString(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Comment ${propertyName} must be a string.`);
  }

  const trimmedValue = propertyValue.trim();

  if (trimmedValue.length === 0) {
    throw new BadRequestException(`Comment ${propertyName} must not be empty.`);
  }

  return trimmedValue;
}

function readOptionalNullableUuid(
  value: Record<string, unknown>,
  propertyName: string,
): string | null {
  const propertyValue = value[propertyName];
  if (propertyValue === undefined || propertyValue === null) return null;
  if (typeof propertyValue !== "string" || !uuidPattern.test(propertyValue)) {
    throw new BadRequestException(`Comment ${propertyName} must be a UUID or null.`);
  }
  return propertyValue;
}

function readOptionalUuidArray(value: Record<string, unknown>, propertyName: string): string[] {
  const propertyValue = value[propertyName];
  if (propertyValue === undefined) return [];
  if (
    !Array.isArray(propertyValue) ||
    propertyValue.length > 50 ||
    propertyValue.some((item) => typeof item !== "string" || !uuidPattern.test(item))
  ) {
    throw new BadRequestException(`Comment ${propertyName} must be an array of UUIDs.`);
  }
  return [...new Set(propertyValue)];
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
