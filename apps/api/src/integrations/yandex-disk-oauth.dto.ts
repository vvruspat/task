import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import type {
  CompleteYandexDiskOAuthInput,
  SelectYandexDiskFolderInput,
  SelectYandexDiskRootFolderInput,
  YandexDiskAuthorizationStart,
  YandexDiskFolderAssignment,
  YandexDiskFolderAssignmentResponse,
  YandexDiskFolderTargetType,
  YandexDiskOAuthCompletion,
  YandexDiskRootFolder,
} from "./yandex-disk-oauth.contracts.js";
import { yandexDiskFolderTargetTypes } from "./yandex-disk-oauth.contracts.js";

export class YandexDiskAuthorizationStartDto implements YandexDiskAuthorizationStart {
  @ApiProperty({ format: "uri" }) readonly authorizationUrl: string;

  constructor(value: YandexDiskAuthorizationStart) {
    this.authorizationUrl = value.authorizationUrl;
  }
}

export class CompleteYandexDiskOAuthDto implements CompleteYandexDiskOAuthInput {
  @ApiProperty() readonly code: string;
  @ApiProperty() readonly state: string;

  constructor(value: CompleteYandexDiskOAuthInput) {
    this.code = value.code;
    this.state = value.state;
  }
}

export class YandexDiskOAuthCompletionDto implements YandexDiskOAuthCompletion {
  @ApiProperty({ format: "uuid" }) readonly integrationId: string;
  @ApiProperty({ enum: ["yandex-disk"] }) readonly pluginKey = "yandex-disk" as const;
  @ApiProperty({ enum: ["connected"] }) readonly status = "connected" as const;
  @ApiProperty({ format: "uuid" }) readonly workspaceId: string;

  constructor(value: YandexDiskOAuthCompletion) {
    this.integrationId = value.integrationId;
    this.workspaceId = value.workspaceId;
  }
}

export class SelectYandexDiskRootFolderDto implements SelectYandexDiskRootFolderInput {
  @ApiProperty({ example: "disk:/tAsk", maxLength: 1024 }) readonly path: string;

  constructor(value: SelectYandexDiskRootFolderInput) {
    this.path = value.path;
  }
}

export class YandexDiskRootFolderDto implements YandexDiskRootFolder {
  @ApiProperty({ format: "uuid" }) readonly externalResourceId: string;
  @ApiProperty() readonly name: string;
  @ApiProperty() readonly path: string;
  @ApiProperty() readonly providerResourceId: string;
  @ApiProperty({ format: "uri", nullable: true, type: String }) readonly webUrl: string | null;

  constructor(value: YandexDiskRootFolder) {
    this.externalResourceId = value.externalResourceId;
    this.name = value.name;
    this.path = value.path;
    this.providerResourceId = value.providerResourceId;
    this.webUrl = value.webUrl;
  }
}

export class SelectYandexDiskFolderDto implements SelectYandexDiskFolderInput {
  @ApiProperty({ example: "disk:/Projects/Acme", maxLength: 1024 }) readonly path: string;

  constructor(value: SelectYandexDiskFolderInput) {
    this.path = value.path;
  }
}

export class YandexDiskFolderAssignmentDto implements YandexDiskFolderAssignment {
  @ApiProperty({ enum: ["managed", "selected"] })
  readonly assignmentSource: "managed" | "selected";
  @ApiProperty({ format: "uuid" }) readonly externalResourceId: string;
  @ApiProperty() readonly name: string;
  @ApiProperty() readonly path: string;
  @ApiProperty() readonly providerResourceId: string;
  @ApiProperty({ format: "uuid" }) readonly targetId: string;
  @ApiProperty({ enum: yandexDiskFolderTargetTypes })
  readonly targetType: YandexDiskFolderTargetType;
  @ApiProperty({ format: "uri", nullable: true, type: String }) readonly webUrl: string | null;

  constructor(value: YandexDiskFolderAssignment) {
    this.assignmentSource = value.assignmentSource;
    this.externalResourceId = value.externalResourceId;
    this.name = value.name;
    this.path = value.path;
    this.providerResourceId = value.providerResourceId;
    this.targetId = value.targetId;
    this.targetType = value.targetType;
    this.webUrl = value.webUrl;
  }
}

export class YandexDiskFolderAssignmentResponseDto implements YandexDiskFolderAssignmentResponse {
  @ApiProperty({ nullable: true, type: YandexDiskFolderAssignmentDto })
  readonly folder: YandexDiskFolderAssignmentDto | null;

  constructor(value: YandexDiskFolderAssignmentResponse) {
    this.folder = value.folder === null ? null : new YandexDiskFolderAssignmentDto(value.folder);
  }
}

export class ParseCompleteYandexDiskOAuthPipe
  implements PipeTransform<unknown, CompleteYandexDiskOAuthDto>
{
  transform(value: unknown): CompleteYandexDiskOAuthDto {
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
    return new CompleteYandexDiskOAuthDto({ code, state });
  }
}

export class ParseSelectYandexDiskRootFolderPipe
  implements PipeTransform<unknown, SelectYandexDiskRootFolderDto>
{
  transform(value: unknown): SelectYandexDiskRootFolderDto {
    if (!isRecord(value) || !isValidYandexDiskPath(value["path"])) throw invalidRootFolder();
    return new SelectYandexDiskRootFolderDto({ path: value["path"] });
  }
}

export class ParseSelectYandexDiskFolderPipe
  implements PipeTransform<unknown, SelectYandexDiskFolderDto>
{
  transform(value: unknown): SelectYandexDiskFolderDto {
    if (!isRecord(value) || !isValidYandexDiskPath(value["path"])) throw invalidFolder();
    return new SelectYandexDiskFolderDto({ path: value["path"] });
  }
}

export class ParseYandexDiskFolderTargetTypePipe
  implements PipeTransform<string, YandexDiskFolderTargetType>
{
  transform(value: string): YandexDiskFolderTargetType {
    if (value === "project" || value === "task") return value;
    throw new BadRequestException("Yandex Disk folder target must be a project or task.");
  }
}

function isValidYandexDiskPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 1_024 &&
    value.trim() === value &&
    (value.startsWith("disk:/") || value.startsWith("/")) &&
    !Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
    })
  );
}

function invalidOAuthCallback(): BadRequestException {
  return new BadRequestException("Yandex Disk OAuth callback is invalid.");
}

function invalidRootFolder(): BadRequestException {
  return new BadRequestException("Yandex Disk root folder selection is invalid.");
}

function invalidFolder(): BadRequestException {
  return new BadRequestException("Yandex Disk folder selection is invalid.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
