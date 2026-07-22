import assert from "node:assert/strict";
import test from "node:test";
import {
  isGoogleDrivePickerSession,
  isGoogleDriveRootFolder,
  isIntegrationCatalog,
  isTelegramConnectToken,
  isWorkspaceIntegration,
  readGoogleDriveRootFolderConfig,
} from "./workspace-integrations.ts";

const integration = {
  config: {},
  connectedAt: null,
  connectedByUserId: null,
  createdAt: "2026-07-22T10:00:00.000Z",
  disconnectedAt: null,
  id: "11111111-1111-4111-8111-111111111111",
  installedByUserId: "22222222-2222-4222-8222-222222222222",
  lastError: null,
  pluginKey: "google-drive",
  pluginVersion: "0.1.0",
  status: "disconnected",
  updatedAt: "2026-07-22T10:00:00.000Z",
  workspaceId: "33333333-3333-4333-8333-333333333333",
};

const health = {
  checkedAt: "2026-07-22T10:01:00.000Z",
  connection: { lastError: null, status: "connected" },
  deliveries: {
    deadCount: 0,
    pendingCount: 1,
    processingCount: 0,
    succeededCount: 12,
  },
  status: "healthy",
  subscriptions: {
    activeCount: 1,
    errorCount: 0,
    expiredCount: 0,
    renewingCount: 0,
    stoppedCount: 0,
  },
  webhooks: {
    failedCount: 0,
    ignoredCount: 1,
    processedCount: 8,
    processingCount: 0,
    receivedCount: 0,
  },
};

test("workspace integration guards accept generated catalog responses", () => {
  assert.equal(isWorkspaceIntegration(integration), true);
  assert.equal(
    isIntegrationCatalog([
      {
        authKind: "oauth2",
        capabilityKinds: ["resource_provider", "webhook_handler"],
        description: "Drive files and folders",
        health,
        iconKey: "google-drive",
        installation: integration,
        name: "Google Drive",
        pluginKey: "google-drive",
        pluginVersion: "0.1.0",
        requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
      },
    ]),
    true,
  );
});

test("Telegram connect token boundary requires a command and valid expiry", () => {
  const token = {
    command: `/connect ${"a".repeat(43)}`,
    expiresAt: "2026-07-22T13:00:00.000Z",
  };
  assert.equal(isTelegramConnectToken(token), true);
  assert.equal(isTelegramConnectToken({ ...token, expiresAt: "not-a-date" }), false);
  assert.equal(isTelegramConnectToken({ ...token, command: "" }), false);
});

test("workspace integration guards reject unknown enum values and malformed config", () => {
  assert.equal(isWorkspaceIntegration({ ...integration, config: null }), false);
  assert.equal(
    isIntegrationCatalog([
      {
        authKind: "password",
        capabilityKinds: [],
        description: "Invalid",
        health: null,
        iconKey: "invalid",
        installation: null,
        name: "Invalid",
        pluginKey: "invalid",
        pluginVersion: "0.1.0",
        requiredScopes: [],
      },
    ]),
    false,
  );
  assert.equal(
    isIntegrationCatalog([
      {
        authKind: "oauth2",
        capabilityKinds: [],
        description: "Invalid health",
        health: { ...health, deliveries: { ...health.deliveries, deadCount: -1 } },
        iconKey: "invalid-health",
        installation: integration,
        name: "Invalid health",
        pluginKey: "invalid-health",
        pluginVersion: "0.1.0",
        requiredScopes: [],
      },
    ]),
    false,
  );
});

test("Google Drive Picker and root folder boundaries reject malformed responses", () => {
  const pickerSession = {
    accessToken: "short-lived-token",
    appId: "123456789012",
    developerKey: "picker-key",
    expiresAt: "2026-07-22T13:00:00.000Z",
  };
  const rootFolder = {
    externalResourceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "tAsk workspace",
    providerResourceId: "google-drive-folder-id",
    webUrl: "https://drive.google.com/drive/folders/google-drive-folder-id",
  };
  assert.equal(isGoogleDrivePickerSession(pickerSession), true);
  assert.equal(isGoogleDrivePickerSession({ ...pickerSession, accessToken: "" }), false);
  assert.equal(isGoogleDriveRootFolder(rootFolder), true);
  assert.equal(isGoogleDriveRootFolder({ ...rootFolder, webUrl: 42 }), false);
  const configuredIntegration: unknown = { ...integration, config: { rootFolder } };
  assert.equal(isWorkspaceIntegration(configuredIntegration), true);
  if (!isWorkspaceIntegration(configuredIntegration)) {
    throw new Error("Expected a valid configured workspace integration.");
  }
  assert.deepEqual(readGoogleDriveRootFolderConfig(configuredIntegration), rootFolder);
});
