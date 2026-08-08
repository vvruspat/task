import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import {
  type IntegrationPlugin,
  integrationAuthKinds,
  integrationCapabilityKinds,
} from "@task/integration-sdk";
import type {
  IntegrationCatalogItem,
  TelegramConnectionSettings,
  UpdateTelegramConnectionSettingsInput,
  WorkspaceIntegration,
  WorkspaceIntegrationConnection,
  WorkspaceIntegrationConnectionHealth,
  WorkspaceIntegrationDeliveryHealth,
  WorkspaceIntegrationHealth,
  WorkspaceIntegrationStatus,
  WorkspaceIntegrationSubscriptionHealth,
  WorkspaceIntegrationWebhookHealth,
} from "./integrations.contracts.js";
import { workspaceIntegrationHealthStatuses } from "./integrations.contracts.js";

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

export class WorkspaceIntegrationConnectionHealthDto
  implements WorkspaceIntegrationConnectionHealth
{
  @ApiProperty({ enum: ["connected", "disconnected", "error", "missing"] })
  readonly status: WorkspaceIntegrationConnectionHealth["status"];
  @ApiProperty({ nullable: true, type: String }) readonly lastError: string | null;

  constructor(value: WorkspaceIntegrationConnectionHealth) {
    this.status = value.status;
    this.lastError = value.lastError;
  }
}

export class TelegramConnectionSettingsDto implements TelegramConnectionSettings {
  @ApiProperty()
  readonly conversationHistoryAccess: boolean;

  constructor(value: TelegramConnectionSettings) {
    this.conversationHistoryAccess = value.conversationHistoryAccess;
  }
}

export class WorkspaceIntegrationConnectionDto implements WorkspaceIntegrationConnection {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty() readonly providerAccountId: string;
  @ApiProperty({ nullable: true, type: String }) readonly displayName: string | null;
  @ApiProperty({ enum: ["connected", "disconnected", "error"] })
  readonly status: WorkspaceIntegrationConnection["status"];
  @ApiProperty({ format: "date-time" }) readonly connectedAt: Date;
  @ApiProperty({ nullable: true, type: String }) readonly lastError: string | null;
  @ApiProperty({ nullable: true, type: TelegramConnectionSettingsDto })
  readonly telegramSettings: TelegramConnectionSettingsDto | null;

  constructor(value: WorkspaceIntegrationConnection) {
    this.id = value.id;
    this.providerAccountId = value.providerAccountId;
    this.displayName = value.displayName;
    this.status = value.status;
    this.connectedAt = value.connectedAt;
    this.lastError = value.lastError;
    this.telegramSettings =
      value.telegramSettings === null
        ? null
        : new TelegramConnectionSettingsDto(value.telegramSettings);
  }
}

export class UpdateTelegramConnectionSettingsDto implements UpdateTelegramConnectionSettingsInput {
  @ApiProperty()
  readonly conversationHistoryAccess: boolean = false;
}

export class ParseUpdateTelegramConnectionSettingsBodyPipe
  implements PipeTransform<unknown, UpdateTelegramConnectionSettingsInput>
{
  transform(value: unknown): UpdateTelegramConnectionSettingsInput {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new BadRequestException("Telegram chat settings payload must be an object.");
    }
    if (!("conversationHistoryAccess" in value)) {
      throw new BadRequestException("conversationHistoryAccess is required.");
    }
    const conversationHistoryAccess = value.conversationHistoryAccess;
    if (typeof conversationHistoryAccess !== "boolean") {
      throw new BadRequestException("conversationHistoryAccess must be a boolean.");
    }
    return { conversationHistoryAccess };
  }
}

export class WorkspaceIntegrationSubscriptionHealthDto
  implements WorkspaceIntegrationSubscriptionHealth
{
  @ApiProperty({ minimum: 0 }) readonly activeCount: number;
  @ApiProperty({ minimum: 0 }) readonly renewingCount: number;
  @ApiProperty({ minimum: 0 }) readonly expiredCount: number;
  @ApiProperty({ minimum: 0 }) readonly errorCount: number;
  @ApiProperty({ minimum: 0 }) readonly stoppedCount: number;

  constructor(value: WorkspaceIntegrationSubscriptionHealth) {
    this.activeCount = value.activeCount;
    this.renewingCount = value.renewingCount;
    this.expiredCount = value.expiredCount;
    this.errorCount = value.errorCount;
    this.stoppedCount = value.stoppedCount;
  }
}

export class WorkspaceIntegrationDeliveryHealthDto implements WorkspaceIntegrationDeliveryHealth {
  @ApiProperty({ minimum: 0 }) readonly pendingCount: number;
  @ApiProperty({ minimum: 0 }) readonly processingCount: number;
  @ApiProperty({ minimum: 0 }) readonly succeededCount: number;
  @ApiProperty({ minimum: 0 }) readonly deadCount: number;

  constructor(value: WorkspaceIntegrationDeliveryHealth) {
    this.pendingCount = value.pendingCount;
    this.processingCount = value.processingCount;
    this.succeededCount = value.succeededCount;
    this.deadCount = value.deadCount;
  }
}

export class WorkspaceIntegrationWebhookHealthDto implements WorkspaceIntegrationWebhookHealth {
  @ApiProperty({ minimum: 0 }) readonly receivedCount: number;
  @ApiProperty({ minimum: 0 }) readonly processingCount: number;
  @ApiProperty({ minimum: 0 }) readonly processedCount: number;
  @ApiProperty({ minimum: 0 }) readonly ignoredCount: number;
  @ApiProperty({ minimum: 0 }) readonly failedCount: number;

  constructor(value: WorkspaceIntegrationWebhookHealth) {
    this.receivedCount = value.receivedCount;
    this.processingCount = value.processingCount;
    this.processedCount = value.processedCount;
    this.ignoredCount = value.ignoredCount;
    this.failedCount = value.failedCount;
  }
}

export class WorkspaceIntegrationHealthDto implements WorkspaceIntegrationHealth {
  @ApiProperty({ enum: workspaceIntegrationHealthStatuses })
  readonly status: WorkspaceIntegrationHealth["status"];
  @ApiProperty({ format: "date-time" }) readonly checkedAt: Date;
  @ApiProperty({ type: WorkspaceIntegrationConnectionHealthDto })
  readonly connection: WorkspaceIntegrationConnectionHealthDto;
  @ApiProperty({ type: WorkspaceIntegrationSubscriptionHealthDto })
  readonly subscriptions: WorkspaceIntegrationSubscriptionHealthDto;
  @ApiProperty({ type: WorkspaceIntegrationDeliveryHealthDto })
  readonly deliveries: WorkspaceIntegrationDeliveryHealthDto;
  @ApiProperty({ type: WorkspaceIntegrationWebhookHealthDto })
  readonly webhooks: WorkspaceIntegrationWebhookHealthDto;

  constructor(value: WorkspaceIntegrationHealth) {
    this.status = value.status;
    this.checkedAt = value.checkedAt;
    this.connection = new WorkspaceIntegrationConnectionHealthDto(value.connection);
    this.subscriptions = new WorkspaceIntegrationSubscriptionHealthDto(value.subscriptions);
    this.deliveries = new WorkspaceIntegrationDeliveryHealthDto(value.deliveries);
    this.webhooks = new WorkspaceIntegrationWebhookHealthDto(value.webhooks);
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
  @ApiProperty({ isArray: true, type: WorkspaceIntegrationConnectionDto })
  readonly connections: WorkspaceIntegrationConnectionDto[];
  @ApiProperty({ nullable: true, type: WorkspaceIntegrationHealthDto })
  readonly health: WorkspaceIntegrationHealthDto | null;

  constructor(
    plugin: IntegrationPlugin,
    installation: WorkspaceIntegration | null,
    connections: WorkspaceIntegrationConnection[],
    health: WorkspaceIntegrationHealth | null,
  ) {
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
    this.connections = connections.map(
      (connection) => new WorkspaceIntegrationConnectionDto(connection),
    );
    this.health = health === null ? null : new WorkspaceIntegrationHealthDto(health);
  }
}
