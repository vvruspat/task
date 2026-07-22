import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { WorkspaceMemberDto, WorkspaceSummaryDto } from "../workspaces/workspaces.dto.js";
import type {
  AcceptInvitationResult,
  CreateWorkspaceInvitationInput,
  InvitationPreview,
  InvitationRole,
  InvitationStatus,
  WorkspaceInvitation,
} from "./invitations.contracts.js";

const invitationRoles = ["admin", "member", "guest"] as const;
const invitationStatuses = ["pending", "expired", "used", "revoked"] as const;
const invitationTokenPattern = /^[A-Za-z0-9_-]{43}$/u;

export class CreateWorkspaceInvitationDto implements CreateWorkspaceInvitationInput {
  @ApiProperty({ example: "teammate@example.com", format: "email", type: String })
  readonly email: string = "";

  @ApiProperty({ enum: invitationRoles })
  readonly role: InvitationRole = "member";
}

export class WorkspaceInvitationDto implements WorkspaceInvitation {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty({ format: "uuid" }) readonly workspaceId: string;
  @ApiProperty({ format: "email" }) readonly email: string;
  @ApiProperty({ enum: invitationRoles }) readonly role: InvitationRole;
  @ApiProperty({ enum: invitationStatuses }) readonly status: InvitationStatus;
  @ApiProperty({ format: "date-time" }) readonly expiresAt: Date;
  @ApiProperty({ format: "date-time" }) readonly createdAt: Date;

  constructor(value: WorkspaceInvitation) {
    this.id = value.id;
    this.workspaceId = value.workspaceId;
    this.email = value.email;
    this.role = value.role;
    this.status = value.status;
    this.expiresAt = value.expiresAt;
    this.createdAt = value.createdAt;
  }
}

export class InvitationPreviewDto implements InvitationPreview {
  @ApiProperty({ format: "uuid" }) readonly workspaceId: string;
  @ApiProperty() readonly workspaceName: string;
  @ApiProperty({ format: "email" }) readonly email: string;
  @ApiProperty({ enum: invitationRoles }) readonly role: InvitationRole;
  @ApiProperty({ enum: invitationStatuses }) readonly status: InvitationStatus;
  @ApiProperty({ format: "date-time" }) readonly expiresAt: Date;

  constructor(value: InvitationPreview) {
    this.workspaceId = value.workspaceId;
    this.workspaceName = value.workspaceName;
    this.email = value.email;
    this.role = value.role;
    this.status = value.status;
    this.expiresAt = value.expiresAt;
  }
}

export class AcceptInvitationResultDto implements AcceptInvitationResult {
  @ApiProperty({ type: WorkspaceSummaryDto }) readonly workspace: WorkspaceSummaryDto;
  @ApiProperty({ type: WorkspaceMemberDto }) readonly member: WorkspaceMemberDto;

  constructor(value: AcceptInvitationResult) {
    this.workspace = new WorkspaceSummaryDto(value.workspace);
    this.member = new WorkspaceMemberDto(value.member);
  }
}

export class ParseCreateWorkspaceInvitationBodyPipe
  implements PipeTransform<unknown, CreateWorkspaceInvitationInput>
{
  transform(value: unknown): CreateWorkspaceInvitationInput {
    if (!isRecord(value)) {
      throw new BadRequestException("Invitation payload must be an object.");
    }
    const email = value["email"];
    const role = value["role"];
    if (typeof email !== "string" || !isEmail(email)) {
      throw new BadRequestException("Invitation email must be valid.");
    }
    if (!isInvitationRole(role)) {
      throw new BadRequestException("Invitation role must be admin, member, or guest.");
    }
    return { email: email.toLowerCase(), role };
  }
}

export class ParseInvitationTokenPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!invitationTokenPattern.test(value)) {
      throw new BadRequestException("Invitation token is invalid.");
    }
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmail(value: string): boolean {
  return value.trim() === value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function isInvitationRole(value: unknown): value is InvitationRole {
  return value === "admin" || value === "member" || value === "guest";
}
