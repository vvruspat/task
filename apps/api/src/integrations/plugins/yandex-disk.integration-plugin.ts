import {
  defineIntegrationPlugin,
  type IntegrationDomainEventHandler,
  type IntegrationPluginManifest,
} from "@task/integration-sdk";

export const yandexDiskRequiredDataScopes = [
  "cloud_api:disk.read",
  "cloud_api:disk.write",
  "cloud_api:disk.info",
] as const;

export function hasRequiredYandexDiskScopes(scopes: readonly string[]): boolean {
  return yandexDiskRequiredDataScopes.every((scope) => scopes.includes(scope));
}

export const yandexDiskIntegrationManifest: IntegrationPluginManifest = {
  apiVersion: 1,
  auth: {
    kind: "oauth2",
    scopes: yandexDiskRequiredDataScopes,
  },
  capabilities: [
    {
      kind: "domain_event_consumer",
      eventNames: [
        "attachment.created.v1",
        "integration.connected.v1",
        "task.archived.v1",
        "task.created.v1",
        "task.updated.v1",
      ],
    },
    { kind: "resource_provider", resourceKinds: ["file", "folder"] },
    { kind: "attachment_exporter", targetResourceKinds: ["folder"] },
  ],
  description:
    "Create task folders, export attachments, and synchronize files added to managed Yandex Disk folders.",
  iconKey: "yandex-disk",
  name: "Yandex Disk",
  pluginKey: "yandex-disk",
  pluginVersion: "0.1.0",
};

export function createYandexDiskIntegrationPlugin(
  handleDomainEvent: IntegrationDomainEventHandler,
): ReturnType<typeof defineIntegrationPlugin> {
  return defineIntegrationPlugin(yandexDiskIntegrationManifest, { handleDomainEvent });
}
