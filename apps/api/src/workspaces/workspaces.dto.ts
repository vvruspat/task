import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  UpdateWorkspaceMemberRoleInput,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceSummary,
} from "./workspaces.contracts.js";

const assignableWorkspaceMemberRoles = ["admin", "member", "guest"] as const;

export class CreateWorkspaceDto implements CreateWorkspaceInput {
  @ApiProperty({ example: "Studio", maxLength: 80, minLength: 1, type: String })
  readonly name: string = "";
}

export class ParseCreateWorkspaceBodyPipe implements PipeTransform<unknown, CreateWorkspaceInput> {
  transform(value: unknown): CreateWorkspaceInput {
    if (!isUnknownRecord(value) || !("name" in value)) {
      throw new BadRequestException("Workspace payload must include a name.");
    }
    return { name: readWorkspaceName(readProperty(value, "name")) };
  }
}

export class UpdateWorkspaceDto implements UpdateWorkspaceInput {
  @ApiPropertyOptional({ example: "Studio", maxLength: 80, minLength: 1 })
  readonly name?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly description?: string | null;
}

export class ParseUpdateWorkspaceBodyPipe implements PipeTransform<unknown, UpdateWorkspaceInput> {
  transform(value: unknown): UpdateWorkspaceInput {
    if (!isUnknownRecord(value) || (!("name" in value) && !("description" in value))) {
      throw new BadRequestException("Workspace payload must include a name or description.");
    }

    const result: UpdateWorkspaceInput = {};
    if ("name" in value) result.name = readWorkspaceName(readProperty(value, "name"));
    if ("description" in value) {
      const description = readProperty(value, "description");
      if (description !== null && typeof description !== "string") {
        throw new BadRequestException("Workspace description must be a string or null.");
      }
      result.description = description;
    }
    return result;
  }
}

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
  @ApiProperty({ nullable: true, type: String })
  readonly description: string | null;

  @ApiProperty({ isArray: true, type: WorkspaceMemberDto })
  readonly members: WorkspaceMemberDto[];

  constructor(workspace: WorkspaceDetail) {
    super(workspace);
    this.description = workspace.description;
    this.members = workspace.members.map((member) => new WorkspaceMemberDto(member));
  }
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProperty(value: Record<string, unknown>, key: string): unknown {
  return value[key];
}

function readWorkspaceName(value: unknown): string {
  if (typeof value !== "string") throw new BadRequestException("Workspace name must be a string.");
  const name = value.trim();
  if (name.length === 0 || name.length > 80) {
    throw new BadRequestException("Workspace name must contain between 1 and 80 characters.");
  }
  return name;
}

function isAssignableWorkspaceMemberRole(
  value: unknown,
): value is UpdateWorkspaceMemberRoleInput["role"] {
  return value === "admin" || value === "member" || value === "guest";
}
