import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import type {
  CompleteGoogleDriveOAuthInput,
  GoogleDriveAuthorizationStart,
  GoogleDriveOAuthCompletion,
  GoogleDrivePickerSession,
  GoogleDriveRootFolder,
  SelectGoogleDriveRootFolderInput,
} from "./google-drive-oauth.contracts.js";

export class GoogleDriveAuthorizationStartDto implements GoogleDriveAuthorizationStart {
  @ApiProperty({ format: "uri" }) readonly authorizationUrl: string;

  constructor(value: GoogleDriveAuthorizationStart) {
    this.authorizationUrl = value.authorizationUrl;
  }
}

export class CompleteGoogleDriveOAuthDto implements CompleteGoogleDriveOAuthInput {
  @ApiProperty() readonly code: string;
  @ApiProperty() readonly state: string;

  constructor(value: CompleteGoogleDriveOAuthInput) {
    this.code = value.code;
    this.state = value.state;
  }
}

export class GoogleDriveOAuthCompletionDto implements GoogleDriveOAuthCompletion {
  @ApiProperty({ format: "uuid" }) readonly integrationId: string;
  @ApiProperty({ enum: ["google-drive"] }) readonly pluginKey = "google-drive" as const;
  @ApiProperty({ enum: ["connected"] }) readonly status = "connected" as const;
  @ApiProperty({ format: "uuid" }) readonly workspaceId: string;

  constructor(value: GoogleDriveOAuthCompletion) {
    this.integrationId = value.integrationId;
    this.workspaceId = value.workspaceId;
  }
}

export class GoogleDrivePickerSessionDto implements GoogleDrivePickerSession {
  @ApiProperty({ description: "Short-lived drive.file token. Never persist or log this value." })
  readonly accessToken: string;
  @ApiProperty() readonly appId: string;
  @ApiProperty() readonly developerKey: string;
  @ApiProperty({ format: "date-time" }) readonly expiresAt: Date;

  constructor(value: GoogleDrivePickerSession) {
    this.accessToken = value.accessToken;
    this.appId = value.appId;
    this.developerKey = value.developerKey;
    this.expiresAt = value.expiresAt;
  }
}

export class SelectGoogleDriveRootFolderDto implements SelectGoogleDriveRootFolderInput {
  @ApiProperty({ maxLength: 1024, pattern: "^[A-Za-z0-9_-]{10,1024}$" })
  readonly folderId: string;

  constructor(value: SelectGoogleDriveRootFolderInput) {
    this.folderId = value.folderId;
  }
}

export class GoogleDriveRootFolderDto implements GoogleDriveRootFolder {
  @ApiProperty({ format: "uuid" }) readonly externalResourceId: string;
  @ApiProperty() readonly name: string;
  @ApiProperty() readonly providerResourceId: string;
  @ApiProperty({ format: "uri", nullable: true, type: String }) readonly webUrl: string | null;

  constructor(value: GoogleDriveRootFolder) {
    this.externalResourceId = value.externalResourceId;
    this.name = value.name;
    this.providerResourceId = value.providerResourceId;
    this.webUrl = value.webUrl;
  }
}

export class ParseCompleteGoogleDriveOAuthPipe
  implements PipeTransform<unknown, CompleteGoogleDriveOAuthDto>
{
  transform(value: unknown): CompleteGoogleDriveOAuthDto {
    if (!isRecord(value)) throw invalidOAuthCallback();
    const code = value["code"];
    const state = value["state"];
    if (
      typeof code !== "string" ||
      code.length === 0 ||
      code.length > 4_096 ||
      typeof state !== "string" ||
      !/^[A-Za-z0-9_-]{32,256}$/u.test(state)
    ) {
      throw invalidOAuthCallback();
    }
    return new CompleteGoogleDriveOAuthDto({ code, state });
  }
}

export class ParseSelectGoogleDriveRootFolderPipe
  implements PipeTransform<unknown, SelectGoogleDriveRootFolderDto>
{
  transform(value: unknown): SelectGoogleDriveRootFolderDto {
    if (!isRecord(value)) throw invalidRootFolder();
    const folderId = value["folderId"];
    if (typeof folderId !== "string" || !/^[A-Za-z0-9_-]{10,1024}$/u.test(folderId)) {
      throw invalidRootFolder();
    }
    return new SelectGoogleDriveRootFolderDto({ folderId });
  }
}

function invalidOAuthCallback(): BadRequestException {
  return new BadRequestException("Google Drive OAuth callback is invalid.");
}

function invalidRootFolder(): BadRequestException {
  return new BadRequestException("Google Drive root folder selection is invalid.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
