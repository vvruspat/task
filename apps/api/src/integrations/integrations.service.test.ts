import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { telegramIntegrationPlugin } from "@task/integration-telegram";
import { IntegrationPluginRegistry } from "./integration-plugin.registry.js";
import type { WorkspaceIntegration } from "./integrations.contracts.js";
import { IntegrationsService } from "./integrations.service.js";
import type {
  InstallWorkspaceIntegrationResult,
  UninstallWorkspaceIntegrationResult,
  WorkspaceIntegrationOperationalSnapshot,
  WorkspaceIntegrationsStore,
} from "./integrations.store.js";
import { googleDriveIntegrationPlugin } from "./plugins/google-drive.integration-plugin.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const integrationId = "33333333-3333-4333-8333-333333333333";

class RecordingIntegrationsStore implements WorkspaceIntegrationsStore {
  snapshots: WorkspaceIntegrationOperationalSnapshot[] | null = [];
  installResult: InstallWorkspaceIntegrationResult | null = null;
  uninstallResult: UninstallWorkspaceIntegrationResult | null = null;
  installArguments: readonly string[] | null = null;

  async listForManager(): Promise<WorkspaceIntegrationOperationalSnapshot[] | null> {
    return this.snapshots;
  }

  async install(
    receivedWorkspaceId: string,
    receivedUserId: string,
    pluginKey: string,
    pluginVersion: string,
  ): Promise<InstallWorkspaceIntegrationResult> {
    this.installArguments = [receivedWorkspaceId, receivedUserId, pluginKey, pluginVersion];
    return this.installResult ?? { integration: createIntegration(pluginKey), status: "installed" };
  }

  async uninstall(): Promise<UninstallWorkspaceIntegrationResult> {
    return (
      this.uninstallResult ?? {
        integration: createIntegration("google-drive"),
        status: "uninstalled",
      }
    );
  }
}

function createService(store: WorkspaceIntegrationsStore): IntegrationsService {
  return new IntegrationsService(
    store,
    new IntegrationPluginRegistry([googleDriveIntegrationPlugin, telegramIntegrationPlugin]),
  );
}

test("integration catalog combines manifests with workspace installation state", async () => {
  const store = new RecordingIntegrationsStore();
  store.snapshots = [createSnapshot("telegram")];

  const catalog = await createService(store).listCatalog(workspaceId, userId);

  assert.deepEqual(
    catalog.map((item) => item.pluginKey),
    ["google-drive", "telegram"],
  );
  assert.equal(catalog[0]?.installation, null);
  assert.equal(catalog[0]?.health, null);
  assert.equal(catalog[1]?.installation?.id, integrationId);
  assert.equal(catalog[1]?.health?.status, "inactive");
});

test("integration health reports connected pipeline failures as degraded", async () => {
  const store = new RecordingIntegrationsStore();
  const snapshot = createSnapshot("google-drive", "connected");
  snapshot.connection = { lastError: null, status: "connected" };
  snapshot.subscriptions.activeCount = 2;
  snapshot.subscriptions.errorCount = 1;
  snapshot.deliveries.deadCount = 3;
  snapshot.webhooks.failedCount = 4;
  store.snapshots = [snapshot];

  const catalog = await createService(store).listCatalog(workspaceId, userId);
  const health = catalog[0]?.health;

  assert.equal(health?.status, "degraded");
  assert.equal(health?.subscriptions.activeCount, 2);
  assert.equal(health?.subscriptions.errorCount, 1);
  assert.equal(health?.deliveries.deadCount, 3);
  assert.equal(health?.webhooks.failedCount, 4);
});

test("integration health reports a missing connection for a connected installation", async () => {
  const store = new RecordingIntegrationsStore();
  store.snapshots = [createSnapshot("telegram", "connected")];

  const catalog = await createService(store).listCatalog(workspaceId, userId);

  assert.equal(catalog[1]?.health?.status, "error");
  assert.equal(catalog[1]?.health?.connection.status, "missing");
});

test("install resolves the deployed plugin version through the registry", async () => {
  const store = new RecordingIntegrationsStore();

  const integration = await createService(store).install(workspaceId, "google-drive", userId);

  assert.equal(integration.pluginKey, "google-drive");
  assert.deepEqual(store.installArguments, [workspaceId, userId, "google-drive", "0.1.0"]);
});

test("install rejects unavailable plugins", async () => {
  const store = new RecordingIntegrationsStore();

  await assert.rejects(
    createService(store).install(workspaceId, "missing", userId),
    NotFoundException,
  );
});

test("catalog and mutations preserve service-level manager checks", async () => {
  const store = new RecordingIntegrationsStore();
  store.snapshots = null;
  store.installResult = { status: "forbidden" };
  store.uninstallResult = { status: "forbidden" };
  const service = createService(store);

  await assert.rejects(service.listCatalog(workspaceId, userId), ForbiddenException);
  await assert.rejects(service.install(workspaceId, "telegram", userId), ForbiddenException);
  await assert.rejects(service.uninstall(workspaceId, integrationId, userId), ForbiddenException);
});

test("uninstall requires a connected integration to be disconnected first", async () => {
  const store = new RecordingIntegrationsStore();
  store.uninstallResult = { status: "integration_connected" };

  await assert.rejects(
    createService(store).uninstall(workspaceId, integrationId, userId),
    ConflictException,
  );
});

function createIntegration(
  pluginKey: string,
  status: WorkspaceIntegration["status"] = "disconnected",
): WorkspaceIntegration {
  return {
    config: {},
    connectedAt: null,
    connectedByUserId: null,
    createdAt: new Date("2026-07-22T12:00:00.000Z"),
    disconnectedAt: null,
    id: integrationId,
    installedByUserId: userId,
    lastError: null,
    pluginKey,
    pluginVersion: "0.1.0",
    status,
    updatedAt: new Date("2026-07-22T12:00:00.000Z"),
    workspaceId,
  };
}

function createSnapshot(
  pluginKey: string,
  status: WorkspaceIntegration["status"] = "disconnected",
): WorkspaceIntegrationOperationalSnapshot {
  return {
    connection: null,
    deliveries: {
      deadCount: 0,
      pendingCount: 0,
      processingCount: 0,
      succeededCount: 0,
    },
    integration: createIntegration(pluginKey, status),
    subscriptions: {
      activeCount: 0,
      errorCount: 0,
      expiredCount: 0,
      renewingCount: 0,
      stoppedCount: 0,
    },
    webhooks: {
      failedCount: 0,
      ignoredCount: 0,
      processedCount: 0,
      processingCount: 0,
      receivedCount: 0,
    },
  };
}
