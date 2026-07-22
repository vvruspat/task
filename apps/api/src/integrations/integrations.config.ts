import { isAbsolute, normalize, parse as parsePath } from "node:path";
import { Injectable } from "@nestjs/common";

const defaultAttachmentExportMaxBytes = 25 * 1_024 * 1_024;

export type IntegrationsEnvironment = {
  ATTACHMENT_STORAGE_ROOT?: string;
  GOOGLE_DRIVE_CLIENT_ID?: string;
  GOOGLE_DRIVE_CLIENT_SECRET?: string;
  GOOGLE_DRIVE_PICKER_API_KEY?: string;
  GOOGLE_DRIVE_PICKER_APP_ID?: string;
  GOOGLE_DRIVE_REDIRECT_URI?: string;
  GOOGLE_DRIVE_WEBHOOK_URL?: string;
  INTEGRATION_SECRET_ENCRYPTION_KEY?: string;
};

export type AttachmentContentConfig = {
  maxBytes: number;
  storageRoot: string | null;
};

export type GoogleDriveOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleDrivePickerConfig = {
  appId: string;
  developerKey: string;
};

export type GoogleDriveWebhookConfig = {
  callbackUrl: string;
};

export type IntegrationsConfig = {
  attachmentContent: AttachmentContentConfig;
  googleDrive: GoogleDriveOAuthConfig | null;
  googleDrivePicker: GoogleDrivePickerConfig | null;
  googleDriveWebhook: GoogleDriveWebhookConfig | null;
  secretEncryptionKey: Buffer | null;
};

export class InvalidIntegrationsEnvironmentError extends Error {
  constructor(variableName: keyof IntegrationsEnvironment, message: string) {
    super(`Invalid ${variableName}: ${message}. Received "[redacted]".`);
    this.name = "InvalidIntegrationsEnvironmentError";
  }
}

export function parseIntegrationsConfig(environment: IntegrationsEnvironment): IntegrationsConfig {
  const attachmentContent = parseAttachmentContentConfig(environment);
  const googleDrive = parseGoogleDriveOAuthConfig(environment);
  const googleDrivePicker = parseGoogleDrivePickerConfig(environment);
  const googleDriveWebhook = parseGoogleDriveWebhookConfig(environment);
  const encodedKey = environment.INTEGRATION_SECRET_ENCRYPTION_KEY;
  if (encodedKey === undefined)
    return {
      attachmentContent,
      googleDrive,
      googleDrivePicker,
      googleDriveWebhook,
      secretEncryptionKey: null,
    };
  if (encodedKey.trim() !== encodedKey || encodedKey.length === 0) {
    throw new InvalidIntegrationsEnvironmentError(
      "INTEGRATION_SECRET_ENCRYPTION_KEY",
      "must be a base64-encoded 32-byte key without surrounding whitespace",
    );
  }
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32 || key.toString("base64") !== encodedKey) {
    throw new InvalidIntegrationsEnvironmentError(
      "INTEGRATION_SECRET_ENCRYPTION_KEY",
      "must be a canonical base64-encoded 32-byte key",
    );
  }
  return {
    attachmentContent,
    googleDrive,
    googleDrivePicker,
    googleDriveWebhook,
    secretEncryptionKey: key,
  };
}

function parseAttachmentContentConfig(
  environment: IntegrationsEnvironment,
): AttachmentContentConfig {
  const storageRoot = environment.ATTACHMENT_STORAGE_ROOT;
  if (storageRoot === undefined) {
    return { maxBytes: defaultAttachmentExportMaxBytes, storageRoot: null };
  }
  assertTrimmedValue("ATTACHMENT_STORAGE_ROOT", storageRoot);
  if (!isAbsolute(storageRoot)) {
    throw new InvalidIntegrationsEnvironmentError(
      "ATTACHMENT_STORAGE_ROOT",
      "must be an absolute path",
    );
  }
  const normalizedRoot = normalize(storageRoot);
  if (normalizedRoot === parsePath(normalizedRoot).root) {
    throw new InvalidIntegrationsEnvironmentError(
      "ATTACHMENT_STORAGE_ROOT",
      "must not be a filesystem root",
    );
  }
  return { maxBytes: defaultAttachmentExportMaxBytes, storageRoot: normalizedRoot };
}

function parseGoogleDrivePickerConfig(
  environment: IntegrationsEnvironment,
): GoogleDrivePickerConfig | null {
  const appId = environment.GOOGLE_DRIVE_PICKER_APP_ID;
  const developerKey = environment.GOOGLE_DRIVE_PICKER_API_KEY;
  if (appId === undefined && developerKey === undefined) return null;
  assertTrimmedValue("GOOGLE_DRIVE_PICKER_APP_ID", appId);
  assertTrimmedValue("GOOGLE_DRIVE_PICKER_API_KEY", developerKey);
  if (appId === undefined || developerKey === undefined) {
    throw new Error("Google Drive Picker configuration validation did not narrow its values.");
  }
  if (!/^\d{6,32}$/u.test(appId)) {
    throw new InvalidIntegrationsEnvironmentError(
      "GOOGLE_DRIVE_PICKER_APP_ID",
      "must be the numeric Google Cloud project number",
    );
  }
  return { appId, developerKey };
}

function parseGoogleDriveWebhookConfig(
  environment: IntegrationsEnvironment,
): GoogleDriveWebhookConfig | null {
  const callbackUrl = environment.GOOGLE_DRIVE_WEBHOOK_URL;
  if (callbackUrl === undefined) return null;
  assertTrimmedValue("GOOGLE_DRIVE_WEBHOOK_URL", callbackUrl);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(callbackUrl);
  } catch {
    throw new InvalidIntegrationsEnvironmentError(
      "GOOGLE_DRIVE_WEBHOOK_URL",
      "must be an absolute HTTPS URL",
    );
  }
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.username.length > 0 ||
    parsedUrl.password.length > 0 ||
    parsedUrl.search.length > 0 ||
    parsedUrl.hash.length > 0
  ) {
    throw new InvalidIntegrationsEnvironmentError(
      "GOOGLE_DRIVE_WEBHOOK_URL",
      "must be an absolute HTTPS URL without credentials, query, or fragment",
    );
  }
  return { callbackUrl: parsedUrl.toString() };
}

@Injectable()
export class IntegrationsConfigProvider {
  private readonly config = parseIntegrationsConfig(process.env);

  getConfig(): IntegrationsConfig {
    return this.config;
  }
}

function parseGoogleDriveOAuthConfig(
  environment: IntegrationsEnvironment,
): GoogleDriveOAuthConfig | null {
  const clientId = environment.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = environment.GOOGLE_DRIVE_CLIENT_SECRET;
  const redirectUri = environment.GOOGLE_DRIVE_REDIRECT_URI;
  if (clientId === undefined && clientSecret === undefined && redirectUri === undefined)
    return null;
  assertTrimmedValue("GOOGLE_DRIVE_CLIENT_ID", clientId);
  assertTrimmedValue("GOOGLE_DRIVE_CLIENT_SECRET", clientSecret);
  assertTrimmedValue("GOOGLE_DRIVE_REDIRECT_URI", redirectUri);
  if (clientId === undefined || clientSecret === undefined || redirectUri === undefined) {
    throw new Error("Google Drive OAuth configuration validation did not narrow its values.");
  }
  let parsedRedirectUri: URL;
  try {
    parsedRedirectUri = new URL(redirectUri);
  } catch {
    throw new InvalidIntegrationsEnvironmentError(
      "GOOGLE_DRIVE_REDIRECT_URI",
      "must be an absolute HTTPS URL, or HTTP for a loopback host",
    );
  }
  if (
    parsedRedirectUri.protocol !== "https:" &&
    !(
      parsedRedirectUri.protocol === "http:" &&
      ["127.0.0.1", "::1", "localhost"].includes(parsedRedirectUri.hostname)
    )
  ) {
    throw new InvalidIntegrationsEnvironmentError(
      "GOOGLE_DRIVE_REDIRECT_URI",
      "must use HTTPS, or HTTP for a loopback host",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

function assertTrimmedValue(
  variableName: keyof IntegrationsEnvironment,
  value: string | undefined,
): void {
  if (value === undefined || value.length === 0 || value.trim() !== value) {
    throw new InvalidIntegrationsEnvironmentError(
      variableName,
      "must be configured as a non-empty value without surrounding whitespace",
    );
  }
}
