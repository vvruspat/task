import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import type { ConfirmationRequestStatus } from "../persistence/types/core-persistence.types.js";
import type {
  ConfirmationRequestDetail,
  ConfirmationRequestSummary,
  CreateConfirmationRequestInput,
} from "./confirmations.contracts.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CreateConfirmationRequestDto implements CreateConfirmationRequestInput {
  @ApiProperty({ format: "uuid" })
  readonly agentRunId: string = "";

  @ApiProperty({ example: "task_skill.apply", minLength: 1 })
  readonly kind: string = "";

  @ApiProperty({ additionalProperties: true, type: "object" })
  readonly preview: Record<string, unknown> = {};

  @ApiProperty({ format: "date-time", type: String })
  readonly expiresAt: string = "";
}

export class ParseCreateConfirmationRequestBodyPipe
  implements PipeTransform<unknown, CreateConfirmationRequestInput>
{
  transform(value: unknown): CreateConfirmationRequestInput {
    return parseCreateConfirmationRequestInput(value);
  }
}

export class ConfirmationRequestSummaryDto implements ConfirmationRequestSummary {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ format: "uuid" })
  readonly agentRunId: string;

  @ApiProperty({ format: "uuid" })
  readonly userId: string;

  @ApiProperty({ example: "task_skill.apply" })
  readonly kind: string;

  @ApiProperty({ additionalProperties: true, type: "object" })
  readonly preview: Record<string, unknown>;

  @ApiProperty({ enum: ["pending", "confirmed", "cancelled", "expired"] })
  readonly status: ConfirmationRequestStatus;

  @ApiProperty({ format: "date-time" })
  readonly expiresAt: Date;

  @ApiProperty({ format: "date-time" })
  readonly createdAt: Date;

  @ApiProperty({ format: "date-time" })
  readonly updatedAt: Date;

  constructor(request: ConfirmationRequestSummary) {
    this.id = request.id;
    this.workspaceId = request.workspaceId;
    this.agentRunId = request.agentRunId;
    this.userId = request.userId;
    this.kind = request.kind;
    this.preview = request.preview;
    this.status = request.status;
    this.expiresAt = request.expiresAt;
    this.createdAt = request.createdAt;
    this.updatedAt = request.updatedAt;
  }
}

export class ConfirmationRequestDetailDto
  extends ConfirmationRequestSummaryDto
  implements ConfirmationRequestDetail {}

function parseCreateConfirmationRequestInput(value: unknown): CreateConfirmationRequestInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Confirmation request payload must be an object.");
  }

  return {
    agentRunId: readRequiredUuid(value, "agentRunId"),
    kind: readRequiredNonEmptyString(value, "kind"),
    preview: readRequiredRecord(value, "preview"),
    expiresAt: readRequiredDateTime(value, "expiresAt"),
  };
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredUuid(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = readRequiredNonEmptyString(value, propertyName);

  if (!uuidV4Pattern.test(propertyValue)) {
    throw new BadRequestException(`Confirmation request ${propertyName} must be a UUID v4 string.`);
  }

  return propertyValue;
}

function readRequiredNonEmptyString(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Confirmation request ${propertyName} must be a string.`);
  }

  const trimmedValue = propertyValue.trim();

  if (trimmedValue.length === 0) {
    throw new BadRequestException(`Confirmation request ${propertyName} must not be empty.`);
  }

  return trimmedValue;
}

function readRequiredRecord(
  value: Record<string, unknown>,
  propertyName: string,
): Record<string, unknown> {
  const propertyValue = value[propertyName];

  if (!isUnknownRecord(propertyValue)) {
    throw new BadRequestException(`Confirmation request ${propertyName} must be an object.`);
  }

  return propertyValue;
}

function readRequiredDateTime(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = readRequiredNonEmptyString(value, propertyName);
  const timestamp = Date.parse(propertyValue);

  if (!Number.isFinite(timestamp)) {
    throw new BadRequestException(`Confirmation request ${propertyName} must be a date-time.`);
  }

  return new Date(timestamp).toISOString();
}
