import { ApiProperty } from "@nestjs/swagger";
import {
  type IntegrationPlugin,
  integrationAuthKinds,
  integrationCapabilityKinds,
} from "@task/integration-sdk";
import type {
  IntegrationCatalogItem,
  WorkspaceIntegration,
  WorkspaceIntegrationStatus,
} from "./integrations.contracts.js";

const workspaceIntegrationStatuses = [
  "authorizing",
  "connected",
  "disconnected",
  "error",
] as const satisfies readonly WorkspaceIntegrationStatus[];

export class WorkspaceIntegrationDto implements WorkspaceIntegration {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty({ format: "uuid" }) readonly workspaceId: string;
  @ApiProperty() readonly pluginKey: string;
  @ApiProperty() readonly pluginVersion: string;
  @ApiProperty({ enum: workspaceIntegrationStatuses }) readonly status: WorkspaceIntegrationStatus;
  @ApiProperty({ additionalProperties: true, type: "object" })
  readonly config: Record<string, unknown>;
  @ApiProperty({ format: "uuid" }) readonly installedByUserId: string;
  @ApiProperty({ format: "uuid", nullable: true, type: String })
  readonly connectedByUserId: string | null;
  @ApiProperty({ format: "date-time", nullable: true, type: String })
  readonly connectedAt: Date | null;
  @ApiProperty({ format: "date-time", nullable: true, type: String })
  readonly disconnectedAt: Date | null;
  @ApiProperty({ nullable: true, type: String }) readonly lastError: string | null;
  @ApiProperty({ format: "date-time" }) readonly createdAt: Date;
  @ApiProperty({ format: "date-time" }) readonly updatedAt: Date;

  constructor(value: WorkspaceIntegration) {
    this.id = value.id;
    this.workspaceId = value.workspaceId;
    this.pluginKey = value.pluginKey;
    this.pluginVersion = value.pluginVersion;
    this.status = value.status;
    this.config = value.config;
    this.installedByUserId = value.installedByUserId;
    this.connectedByUserId = value.connectedByUserId;
    this.connectedAt = value.connectedAt;
    this.disconnectedAt = value.disconnectedAt;
    this.lastError = value.lastError;
    this.createdAt = value.createdAt;
    this.updatedAt = value.updatedAt;
  }
}

export class IntegrationCatalogItemDto implements IntegrationCatalogItem {
  @ApiProperty() readonly pluginKey: string;
  @ApiProperty() readonly pluginVersion: string;
  @ApiProperty() readonly name: string;
  @ApiProperty() readonly description: string;
  @ApiProperty() readonly iconKey: string;
  @ApiProperty({ enum: integrationAuthKinds })
  readonly authKind: IntegrationCatalogItem["authKind"];
  @ApiProperty({ isArray: true, type: String }) readonly requiredScopes: string[];
  @ApiProperty({ enum: integrationCapabilityKinds, isArray: true })
  readonly capabilityKinds: IntegrationCatalogItem["capabilityKinds"];
  @ApiProperty({ nullable: true, type: WorkspaceIntegrationDto })
  readonly installation: WorkspaceIntegrationDto | null;

  constructor(plugin: IntegrationPlugin, installation: WorkspaceIntegration | null) {
    const { manifest } = plugin;
    this.pluginKey = manifest.pluginKey;
    this.pluginVersion = manifest.pluginVersion;
    this.name = manifest.name;
    this.description = manifest.description;
    this.iconKey = manifest.iconKey;
    this.authKind = manifest.auth.kind;
    this.requiredScopes = [...manifest.auth.scopes];
    this.capabilityKinds = manifest.capabilities.map((capability) => capability.kind);
    this.installation = installation === null ? null : new WorkspaceIntegrationDto(installation);
  }
}
