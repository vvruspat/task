import { ApiProperty } from "@nestjs/swagger";
import type { WorkspaceRealtimeEvent, WorkspaceRealtimeEventKind } from "./realtime.contracts.js";

export class WorkspaceRealtimeEventDto implements WorkspaceRealtimeEvent {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({
    enum: ["connected", "changed", "heartbeat", "member_removed", "member_role_changed"],
  })
  readonly kind: WorkspaceRealtimeEventKind;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ format: "uuid", nullable: true, type: String })
  readonly projectId: string | null;

  @ApiProperty({ format: "uuid", nullable: true, type: String })
  readonly taskId: string | null;

  @ApiProperty({ format: "uuid", nullable: true, type: String })
  readonly memberId: string | null;

  @ApiProperty({ format: "uuid", nullable: true, type: String })
  readonly memberUserId: string | null;

  @ApiProperty({ enum: ["owner", "admin", "member", "guest"], nullable: true })
  readonly memberRole: WorkspaceRealtimeEvent["memberRole"];

  @ApiProperty({ format: "date-time" })
  readonly occurredAt: Date;

  constructor(event: WorkspaceRealtimeEvent) {
    this.id = event.id;
    this.kind = event.kind;
    this.workspaceId = event.workspaceId;
    this.projectId = event.projectId;
    this.taskId = event.taskId;
    this.memberId = event.memberId;
    this.memberUserId = event.memberUserId;
    this.memberRole = event.memberRole;
    this.occurredAt = event.occurredAt;
  }
}
