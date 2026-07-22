import assert from "node:assert/strict";
import test from "node:test";
import {
  InvalidIntegrationsEnvironmentError,
  parseIntegrationsConfig,
} from "./integrations.config.js";

test("integration secret encryption key is optional until a connection stores credentials", () => {
  assert.deepEqual(parseIntegrationsConfig({}), {
    attachmentContent: { maxBytes: 26_214_400, storageRoot: null },
    googleDrive: null,
    googleDrivePicker: null,
    googleDriveWebhook: null,
    secretEncryptionKey: null,
  });
});

test("integration secret encryption key requires exactly 32 canonical base64 bytes", () => {
  const encoded = Buffer.alloc(32, 7).toString("base64");
  assert.deepEqual(parseIntegrationsConfig({ INTEGRATION_SECRET_ENCRYPTION_KEY: encoded }), {
    attachmentContent: { maxBytes: 26_214_400, storageRoot: null },
    googleDrive: null,
    googleDrivePicker: null,
    googleDriveWebhook: null,
    secretEncryptionKey: Buffer.alloc(32, 7),
  });
  assert.throws(
    () => parseIntegrationsConfig({ INTEGRATION_SECRET_ENCRYPTION_KEY: "not-base64" }),
    InvalidIntegrationsEnvironmentError,
  );
  assert.throws(
    () => parseIntegrationsConfig({ INTEGRATION_SECRET_ENCRYPTION_KEY: ` ${encoded}` }),
    /\[redacted\]/u,
  );
});

test("attachment content storage requires a bounded absolute root", () => {
  assert.deepEqual(parseIntegrationsConfig({ ATTACHMENT_STORAGE_ROOT: "/srv/task/files" }), {
    attachmentContent: { maxBytes: 26_214_400, storageRoot: "/srv/task/files" },
    googleDrive: null,
    googleDrivePicker: null,
    googleDriveWebhook: null,
    secretEncryptionKey: null,
  });
  assert.throws(
    () => parseIntegrationsConfig({ ATTACHMENT_STORAGE_ROOT: "relative/files" }),
    InvalidIntegrationsEnvironmentError,
  );
  assert.throws(
    () => parseIntegrationsConfig({ ATTACHMENT_STORAGE_ROOT: "/" }),
    InvalidIntegrationsEnvironmentError,
  );
});

test("Google Drive webhook configuration requires a public HTTPS callback URL", () => {
  assert.deepEqual(
    parseIntegrationsConfig({
      GOOGLE_DRIVE_WEBHOOK_URL: "https://task.example.com/api/integrations/webhooks/google-drive",
    }).googleDriveWebhook,
    { callbackUrl: "https://task.example.com/api/integrations/webhooks/google-drive" },
  );
  for (const callbackUrl of [
    "http://task.example.com/hooks/drive",
    "https://user:password@task.example.com/hooks/drive",
    "https://task.example.com/hooks/drive?secret=value",
  ]) {
    assert.throws(
      () => parseIntegrationsConfig({ GOOGLE_DRIVE_WEBHOOK_URL: callbackUrl }),
      InvalidIntegrationsEnvironmentError,
    );
  }
});

test("Google Drive Picker configuration requires a project number and developer key", () => {
  const picker = {
    GOOGLE_DRIVE_PICKER_API_KEY: "picker-developer-key",
    GOOGLE_DRIVE_PICKER_APP_ID: "123456789012",
  };
  assert.deepEqual(parseIntegrationsConfig(picker).googleDrivePicker, {
    appId: "123456789012",
    developerKey: "picker-developer-key",
  });
  assert.throws(
    () =>
      parseIntegrationsConfig({ GOOGLE_DRIVE_PICKER_APP_ID: picker.GOOGLE_DRIVE_PICKER_APP_ID }),
    /GOOGLE_DRIVE_PICKER_API_KEY/u,
  );
  assert.throws(
    () => parseIntegrationsConfig({ ...picker, GOOGLE_DRIVE_PICKER_APP_ID: "project-name" }),
    /\[redacted\]/u,
  );
});

test("Google Drive OAuth configuration is complete and uses a safe redirect URI", () => {
  const environment = {
    GOOGLE_DRIVE_CLIENT_ID: "client-id",
    GOOGLE_DRIVE_CLIENT_SECRET: "client-secret",
    GOOGLE_DRIVE_REDIRECT_URI: "https://app.example.com/api/integrations/google-drive/callback",
  };
  assert.deepEqual(parseIntegrationsConfig(environment).googleDrive, {
    clientId: "client-id",
    clientSecret: "client-secret",
    redirectUri: "https://app.example.com/api/integrations/google-drive/callback",
  });
  const incompleteEnvironment = {
    GOOGLE_DRIVE_CLIENT_ID: environment.GOOGLE_DRIVE_CLIENT_ID,
    GOOGLE_DRIVE_REDIRECT_URI: environment.GOOGLE_DRIVE_REDIRECT_URI,
  };
  assert.throws(
    () => parseIntegrationsConfig(incompleteEnvironment),
    /GOOGLE_DRIVE_CLIENT_SECRET/u,
  );
  assert.throws(
    () =>
      parseIntegrationsConfig({ ...environment, GOOGLE_DRIVE_REDIRECT_URI: "http://example.com" }),
    /\[redacted\]/u,
  );
});
