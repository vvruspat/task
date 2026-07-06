import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import type { CreateTaskCommentInput, TaskComment } from "./comments.contracts.js";

export class CreateTaskCommentDto implements CreateTaskCommentInput {
  @ApiProperty({ example: "Bass take is ready for review.", minLength: 1 })
  readonly body: string = "";
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
