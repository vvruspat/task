import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createTaskBackendClient, type TaskBackendFetch } from "./backend-client.js";
import { loadTaskMcpConfig, type TaskMcpEnvironment } from "./config.js";
import { parseIntegrationMcpToolDefinitions } from "./integration-mcp-tools.js";
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
  const integrationTools =
    config.integrationContext === null
      ? null
      : parseIntegrationMcpToolDefinitions(
          await backendClient.listIntegrationMcpTools(config.integrationContext),
        );
  const server = createTaskMcpServer({
    backendClient,
    ...(config.integrationContext === null || integrationTools === null
      ? {}
      : {
          integration: {
            backendClient,
            context: config.integrationContext,
            tools: integrationTools,
          },
        }),
    name: config.name,
    version: config.version,
  });
  const connect = options.connect ?? connectTaskMcpServerToStdio;

  await connect(server);
}
