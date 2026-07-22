import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type {
  IntegrationAgentToolCall,
  IntegrationAgentToolDefinition,
  IntegrationAgentToolExecutionContext,
  IntegrationAgentToolProvider,
} from "@task/integration-sdk";
import { GoogleDriveClient, type GoogleDriveFile } from "./google-drive.client.js";
import { GoogleDriveAccessService } from "./google-drive-access.service.js";

const googleDrivePluginKey = "google-drive";
const driveFileIdPattern = /^[A-Za-z0-9_-]{10,1024}$/u;

export const googleDriveAgentToolDefinitions = [
  {
    description:
      "Search Google Drive files available to the connected workspace integration. Returns file metadata and links, not file contents.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        limit: { maximum: 20, minimum: 1, type: "integer" },
        query: { maxLength: 200, minLength: 1, type: "string" },
      },
      required: ["query"],
      type: "object",
    },
    name: "search",
    readOnly: true,
  },
  {
    description:
      "Get metadata for one Google Drive file by its stable Drive file ID. Returns its name, type, modification time, parent, version, and web link.",
    inputSchema: {
      additionalProperties: false,
      properties: {
        fileId: { maxLength: 1_024, minLength: 10, type: "string" },
      },
      required: ["fileId"],
      type: "object",
    },
    name: "get",
    readOnly: true,
  },
] as const satisfies readonly IntegrationAgentToolDefinition[];

type GoogleDriveAgentAccess = Pick<GoogleDriveAccessService, "getAccessGrant">;
type GoogleDriveAgentClient = Pick<GoogleDriveClient, "getFile" | "searchFiles">;

@Injectable()
export class GoogleDriveAgentToolProvider implements IntegrationAgentToolProvider {
  readonly tools = googleDriveAgentToolDefinitions;

  constructor(
    @Inject(GoogleDriveAccessService)
    private readonly accessService: GoogleDriveAgentAccess,
    @Inject(GoogleDriveClient)
    private readonly client: GoogleDriveAgentClient,
  ) {}

  async execute(
    call: IntegrationAgentToolCall,
    context: IntegrationAgentToolExecutionContext,
  ): Promise<Record<string, unknown>> {
    if (context.pluginKey !== googleDrivePluginKey) {
      throw new BadRequestException(`Unexpected integration plugin ${context.pluginKey}.`);
    }
    const access = await this.accessService.getAccessGrant(
      context.workspaceId,
      context.installationId,
    );
    if (call.name === "search") {
      const query = readSearchQuery(call.arguments);
      const limit = readSearchLimit(call.arguments);
      const result = await this.client.searchFiles(access.accessToken, { limit, query });
      return {
        files: result.files.map(toAgentFileMetadata),
        incomplete: result.incomplete,
        kind: "google_drive_search_results",
        query,
      };
    }
    if (call.name === "get") {
      const fileId = readFileId(call.arguments);
      const file = await this.client.getFile(access.accessToken, fileId);
      return { file: toAgentFileMetadata(file), kind: "google_drive_file" };
    }
    throw new BadRequestException(`Unsupported Google Drive agent tool: ${call.name}`);
  }
}

function readSearchQuery(argumentsValue: Readonly<Record<string, unknown>>): string {
  const value = argumentsValue["query"];
  if (typeof value !== "string") {
    throw new BadRequestException("Google Drive search query must be a string.");
  }
  const query = value.trim();
  if (query.length === 0 || query.length > 200) {
    throw new BadRequestException("Google Drive search query must contain 1 to 200 characters.");
  }
  return query;
}

function readSearchLimit(argumentsValue: Readonly<Record<string, unknown>>): number {
  const value = argumentsValue["limit"];
  if (value === undefined) return 10;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 20) {
    throw new BadRequestException("Google Drive search limit must be an integer from 1 to 20.");
  }
  return value;
}

function readFileId(argumentsValue: Readonly<Record<string, unknown>>): string {
  const value = argumentsValue["fileId"];
  if (typeof value !== "string" || !driveFileIdPattern.test(value)) {
    throw new BadRequestException("Google Drive file ID is invalid.");
  }
  return value;
}

function toAgentFileMetadata(file: GoogleDriveFile): Record<string, unknown> {
  return {
    fileId: file.id,
    mimeType: file.mimeType,
    modifiedAt: file.modifiedAt,
    name: file.name,
    parentId: file.parentId,
    version: file.version,
    webUrl: file.webViewLink,
  };
}
