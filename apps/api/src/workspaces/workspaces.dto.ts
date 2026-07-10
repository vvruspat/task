import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  UpdateWorkspaceMemberRoleInput,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceSummary,
} from "./workspaces.contracts.js";

const assignableWorkspaceMemberRoles = ["admin", "member", "guest"] as const;

export class UpdateWorkspaceMemberRoleDto implements UpdateWorkspaceMemberRoleInput {
  @ApiProperty({ enum: assignableWorkspaceMemberRoles })
  readonly role: UpdateWorkspaceMemberRoleInput["role"] = "member";
}

export class ParseUpdateWorkspaceMemberRoleBodyPipe
  implements PipeTransform<unknown, UpdateWorkspaceMemberRoleInput>
{
  transform(value: unknown): UpdateWorkspaceMemberRoleInput {
    if (!isUnknownRecord(value) || !("role" in value)) {
      throw new BadRequestException("Workspace member role payload must include a role.");
    }

    const role = readProperty(value, "role");

    if (!isAssignableWorkspaceMemberRole(role)) {
      throw new BadRequestException("Workspace member role must be admin, member, or guest.");
    }

    return { role };
  }
}

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

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProperty(value: Record<string, unknown>, key: string): unknown {
  return value[key];
}

function isAssignableWorkspaceMemberRole(
  value: unknown,
): value is UpdateWorkspaceMemberRoleInput["role"] {
  return value === "admin" || value === "member" || value === "guest";
}
