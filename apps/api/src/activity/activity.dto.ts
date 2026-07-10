import { ApiProperty } from "@nestjs/swagger";
import type { TaskActivityEvent } from "./activity.contracts.js";

export class TaskActivityEventDto implements TaskActivityEvent {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty({ format: "uuid", nullable: true, required: true, type: String })
  readonly actorUserId: string | null;
  @ApiProperty() readonly eventType: string;
  @ApiProperty({ format: "uuid" }) readonly entityId: string;
  @ApiProperty() readonly entityType: string;
  @ApiProperty({ additionalProperties: true, type: "object" })
  readonly payload: Record<string, unknown>;
  @ApiProperty({ format: "date-time" }) readonly createdAt: Date;

  constructor(value: TaskActivityEvent) {
    this.id = value.id;
    this.actorUserId = value.actorUserId;
    this.eventType = value.eventType;
    this.entityId = value.entityId;
    this.entityType = value.entityType;
    this.payload = value.payload;
    this.createdAt = value.createdAt;
  }
}
