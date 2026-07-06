import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { WorkspaceDetail, WorkspaceMember, WorkspaceSummary } from "./workspaces.contracts.js";

export class WorkspaceSummaryDto implements WorkspaceSummary {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ example: "Studio" })
  readonly name: string;

  @ApiProperty({ example: "studio" })
  readonly slug: string;

  @ApiProperty({ format: "date-time" })
  readonly createdAt: Date;

  @ApiProperty({ format: "date-time" })
  readonly updatedAt: Date;

  constructor(workspace: WorkspaceSummary) {
    this.id = workspace.id;
    this.name = workspace.name;
    this.slug = workspace.slug;
    this.createdAt = workspace.createdAt;
    this.updatedAt = workspace.updatedAt;
  }
}

export class WorkspaceMemberDto implements WorkspaceMember {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ format: "uuid" })
  readonly userId: string;

  @ApiProperty({ enum: ["owner", "admin", "member", "guest"] })
  readonly role: WorkspaceMember["role"];

  @ApiProperty({ example: "Alex" })
  readonly displayName: string;

  @ApiPropertyOptional({ nullable: true, type: String, example: "alex@example.com" })
  readonly email: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: "https://example.com/avatar.png" })
  readonly avatarUrl: string | null;

  @ApiProperty({ format: "date-time" })
  readonly createdAt: Date;

  @ApiProperty({ format: "date-time" })
  readonly updatedAt: Date;

  constructor(member: WorkspaceMember) {
    this.id = member.id;
    this.workspaceId = member.workspaceId;
    this.userId = member.userId;
    this.role = member.role;
    this.displayName = member.displayName;
    this.email = member.email;
    this.avatarUrl = member.avatarUrl;
    this.createdAt = member.createdAt;
    this.updatedAt = member.updatedAt;
  }
}

export class WorkspaceDetailDto extends WorkspaceSummaryDto implements WorkspaceDetail {
  @ApiProperty({ isArray: true, type: WorkspaceMemberDto })
  readonly members: WorkspaceMemberDto[];

  constructor(workspace: WorkspaceDetail) {
    super(workspace);
    this.members = workspace.members.map((member) => new WorkspaceMemberDto(member));
  }
}
