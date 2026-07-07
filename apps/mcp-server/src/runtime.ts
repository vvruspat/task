import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createTaskBackendClient, type TaskBackendFetch } from "./backend-client.js";
import { loadTaskMcpConfig, type TaskMcpEnvironment } from "./config.js";
import { connectTaskMcpServerToStdio, createTaskMcpServer } from "./mcp-server.js";

export type TaskMcpServerConnector = (server: McpServer) => Promise<void>;

export type RunTaskMcpServerOptions = {
  environment?: TaskMcpEnvironment;
  fetch?: TaskBackendFetch;
  connect?: TaskMcpServerConnector;
};

export async function runTaskMcpServerFromEnvironment(
  options: RunTaskMcpServerOptions = {},
): Promise<void> {
  const config = loadTaskMcpConfig(options.environment);
  const backendClientOptions = {
    baseUrl: config.backendBaseUrl,
  };

  const backendClient = createTaskBackendClient(
    options.fetch === undefined
      ? backendClientOptions
      : {
          ...backendClientOptions,
          fetch: options.fetch,
        },
  );
  const server = createTaskMcpServer({
    backendClient,
    name: config.name,
    version: config.version,
  });
  const connect = options.connect ?? connectTaskMcpServerToStdio;

  await connect(server);
}
