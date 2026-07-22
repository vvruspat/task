export type TaskMcpEnvironment = {
  TASK_API_BASE_URL?: string;
  TASK_MCP_SERVER_NAME?: string;
  TASK_MCP_SERVER_VERSION?: string;
  TASK_MCP_USER_ID?: string;
  TASK_MCP_WORKSPACE_ID?: string;
};

export type TaskMcpIntegrationContext = {
  userId: string;
  workspaceId: string;
};

export type TaskMcpConfig = {
  backendBaseUrl: string;
  integrationContext: TaskMcpIntegrationContext | null;
  name: string;
  version: string;
};

export class InvalidTaskMcpEnvironmentError extends Error {
  constructor(variableName: keyof TaskMcpEnvironment, value: string | undefined, message: string) {
    super(
      `Invalid ${variableName}: ${message}. Received "${formatInvalidValue(variableName, value)}".`,
    );
    this.name = "InvalidTaskMcpEnvironmentError";
  }
}

const defaultServerName = "task-mcp-server";
const defaultServerVersion = "0.0.0";

export function parseTaskMcpConfig(environment: TaskMcpEnvironment): TaskMcpConfig {
  return {
    backendBaseUrl: parseBackendBaseUrl(environment.TASK_API_BASE_URL),
    integrationContext: parseIntegrationContext(environment),
    name: parseOptionalNonEmptyString(
      "TASK_MCP_SERVER_NAME",
      environment.TASK_MCP_SERVER_NAME,
      defaultServerName,
    ),
    version: parseOptionalNonEmptyString(
      "TASK_MCP_SERVER_VERSION",
      environment.TASK_MCP_SERVER_VERSION,
      defaultServerVersion,
    ),
  };
}

function parseIntegrationContext(
  environment: TaskMcpEnvironment,
): TaskMcpIntegrationContext | null {
  const userId = environment.TASK_MCP_USER_ID;
  const workspaceId = environment.TASK_MCP_WORKSPACE_ID;
  if (userId === undefined && workspaceId === undefined) return null;
  return {
    userId: parseUuid("TASK_MCP_USER_ID", userId),
    workspaceId: parseUuid("TASK_MCP_WORKSPACE_ID", workspaceId),
  };
}

function parseUuid(
  variableName: "TASK_MCP_USER_ID" | "TASK_MCP_WORKSPACE_ID",
  value: string | undefined,
): string {
  if (
    value === undefined ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
  ) {
    throw new InvalidTaskMcpEnvironmentError(variableName, value, "must be a UUID v4");
  }
  return value;
}

export function loadTaskMcpConfig(environment: TaskMcpEnvironment = process.env): TaskMcpConfig {
  return parseTaskMcpConfig(environment);
}

function parseBackendBaseUrl(value: string | undefined): string {
  if (value === undefined) {
    throw new InvalidTaskMcpEnvironmentError(
      "TASK_API_BASE_URL",
      value,
      "must be an HTTP or HTTPS URL",
    );
  }

  if (value.trim() !== value || value.length === 0) {
    throw new InvalidTaskMcpEnvironmentError(
      "TASK_API_BASE_URL",
      value,
      "must be an HTTP or HTTPS URL",
    );
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new InvalidTaskMcpEnvironmentError(
      "TASK_API_BASE_URL",
      value,
      "must be an HTTP or HTTPS URL",
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidTaskMcpEnvironmentError(
      "TASK_API_BASE_URL",
      value,
      "must use http:// or https://",
    );
  }

  if (url.hostname.length === 0) {
    throw new InvalidTaskMcpEnvironmentError("TASK_API_BASE_URL", value, "must include a hostname");
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function parseOptionalNonEmptyString(
  variableName: "TASK_MCP_SERVER_NAME" | "TASK_MCP_SERVER_VERSION",
  value: string | undefined,
  defaultValue: string,
): string {
  if (value === undefined) {
    return defaultValue;
  }

  if (value.trim() !== value || value.length === 0) {
    throw new InvalidTaskMcpEnvironmentError(variableName, value, "must not be empty");
  }

  return value;
}

function formatInvalidValue(
  variableName: keyof TaskMcpEnvironment,
  value: string | undefined,
): string {
  if (value === undefined) {
    return "undefined";
  }

  if (variableName === "TASK_API_BASE_URL") {
    return "[redacted]";
  }

  return value;
}
