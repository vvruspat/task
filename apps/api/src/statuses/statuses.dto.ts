import { ApiProperty } from "@nestjs/swagger";
import type { WorkspaceStatus } from "./statuses.contracts.js";

export class WorkspaceStatusDto implements WorkspaceStatus {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

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
    this.name = status.name;
    this.color = status.color;
    this.position = status.position;
    this.isDone = status.isDone;
    this.createdAt = status.createdAt;
    this.updatedAt = status.updatedAt;
  }
}
