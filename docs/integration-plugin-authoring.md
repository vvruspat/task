# Integration plugin authoring

This guide describes the first-party plugin contract shipped in `@task/integration-sdk`. Plugins are
compiled with tAsk and registered at deployment time. Runtime loading of arbitrary third-party code
and a public marketplace are not part of the current trust model.

## Plugin shape

Each plugin consists of a versioned manifest and optional handlers:

```ts
import {
  defineIntegrationPlugin,
  type IntegrationAgentToolProvider,
} from "@task/integration-sdk";

const tools: IntegrationAgentToolProvider = {
  tools: [
    {
      name: "search",
      description: "Search resources visible to the connected account.",
      readOnly: true,
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", minLength: 1, maxLength: 200 },
        },
        required: ["query"],
      },
    },
  ],
  async execute(call, context): Promise<Record<string, unknown>> {
    // Narrow call.arguments at runtime, then use context.workspaceId and
    // context.installationId to enter the plugin's permission-aware service.
    return { kind: "example_search_results", items: [] };
  },
};

export const examplePlugin = defineIntegrationPlugin(
  {
    apiVersion: 1,
    auth: { kind: "oauth2", scopes: ["provider.read"] },
    capabilities: [{ kind: "agent_tool_provider", namespace: "example" }],
    description: "Example workspace integration.",
    iconKey: "example",
    name: "Example",
    pluginKey: "example",
    pluginVersion: "1.0.0",
  },
  { agentTools: tools },
);
```

The manifest is the catalog and dispatch contract. `pluginKey` identifies the installation,
`pluginVersion` pins durable work to deployed code, `auth` describes the external grant, and
`capabilities` declare the only extension points the plugin may implement. A handler without its
matching capability is invalid.

## Agent tool provider contract

`IntegrationAgentToolProvider.tools` contains model-visible definitions. Use a short local
snake-case name; the framework prefixes it with the provider namespace. For example, namespace
`gdrive` plus local name `search` becomes `gdrive_search`. Names must remain stable because they are
stored in agent audit records and may appear in deterministic fixtures.

Every `inputSchema` must describe an object with `additionalProperties: false`. Set explicit length,
count, numeric, and format bounds wherever possible. The schema guides the model but does not replace
runtime validation: `execute` receives `Readonly<Record<string, unknown>>`, so the provider must
narrow or parse every field before calling an external API.

`readOnly` is policy metadata. Set it to `true` only when the tool cannot change tAsk or provider
state. Mutating integration tools must not be enabled until they also enter the confirmation policy;
marking a tool `readOnly: false` alone does not grant permission or constitute confirmation.

`execute` also receives trusted `IntegrationAgentToolExecutionContext` fields:

- `workspaceId` and `userId` identify the tAsk authorization boundary;
- `installationId` selects the connected workspace installation;
- `pluginKey` and `pluginVersion` prevent dispatch to different or stale plugin code.

Never accept these values from tool arguments. Re-check workspace permissions and connection state
inside the service used by `execute`. Retrieve credentials through the secret provider or the
plugin's access service, and never return access tokens, refresh tokens, callback secrets, private
provider metadata, or unbounded content to the model.

## Discovery and execution lifecycle

1. The agent runtime asks for tools using the current server-owned workspace and user context.
2. The integration store requires non-guest workspace membership, a connected installation, and a
   connected external connection.
3. The registry requires the installed plugin version to match the deployed manifest and resolves
   its declared provider namespace.
4. Qualified definitions are merged with core tools. Duplicate names fail closed.
5. A model call is dispatched back through the same workspace service, which resolves the provider
   again and converts the qualified name to the local name.
6. The provider validates arguments and enters its permission-aware access service.
7. The existing agent-run persistence records arguments, result, status, and bounded error data.

This lifecycle keeps tool discovery and execution workspace-scoped even if a model copies a tool
name from another conversation.

## Webhook and conversation ingress handlers

Plugins that receive public callbacks can provide `handlers.webhook` only when the manifest declares
`webhook_handler`. Its `verify` method receives raw headers and an unknown payload, authenticates the
provider request, and returns either `unauthorized` or the accepted payload. Header names, duplicate
values, signatures, timestamps, and replay material remain provider responsibilities. Compare shared
secrets in constant time and never include them in normalized events or audit data.

A plugin can provide `handlers.conversationIngress` only with the `conversation_ingress` capability.
`normalize` receives the authenticated unknown payload and returns the plugin's typed event contract.
This is the single parsing boundary: bound strings and collections, normalize stable provider IDs,
classify supported messages or callbacks, and reject or safely represent malformed input before app
code can call backend services. Provider-specific event types live with the first-party plugin, while
the SDK keeps the handler generic so future chat providers can define their own normalized event
union.

`@task/integration-telegram` is the reference implementation. The API registry imports its manifest,
and `tg-bot` constructs the configured handler implementation with the webhook secret and bot
username. HTTP transport adapters pass headers and payload through unchanged; they do not duplicate
Telegram verification or update parsing.

## Google Drive reference implementation

The Google Drive provider is the first implementation. Its `search` tool uses a bounded Drive
`files.list` full-text query, and `get` resolves one file through `files.get`. Both return normalized
metadata only and use the same access service as folder and attachment flows. The connected OAuth
grant currently uses `drive.file`, so results are limited to files visible through that grant.

Provider behavior follows the official Google Drive documentation for
[search queries](https://developers.google.com/workspace/drive/api/guides/search-files) and
[`files.list`](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list).

## Provider checklist

- Add shared contracts to `@task/integration-sdk` before application DTOs or handlers.
- Declare each capability once and give agent tools a unique, stable namespace.
- Use closed, bounded input schemas and runtime validation for all arguments and responses.
- Enter backend services through workspace/user/installation context; do not inject repositories into
  plugins.
- Keep secrets opaque and redact provider failures before they reach agent audit or users.
- Make external mutations idempotent and route user-visible mutations through confirmation policy.
- Add deterministic tests for registry validation, permission denial, dispatch context, malformed
  external responses, and retries.
- Update the framework delivery checklist and run `graphify update .` with the implementation.

## Controlled MCP adapter

The tAsk MCP server can expose connected providers when the process is scoped with both
`TASK_MCP_WORKSPACE_ID` and `TASK_MCP_USER_ID`. These values are server-owned deployment context;
they never appear in model-visible tool arguments. At startup the adapter asks the backend for the
current workspace's connected read-only tools, validates their closed JSON schemas, converts them to
runtime Zod schemas, and registers their qualified names directly with the MCP server. Restart the
process after changing an integration connection so discovery can refresh.

Every call returns to the backend integration service instead of calling a provider from the MCP
process. The backend repeats membership, installation, connection, and plugin-version checks,
executes through the provider contract, validates the bounded JSON result, and stores a durable row
in `integration_mcp_tool_calls`. The adapter fails closed if the backend returns a malformed schema,
an unexpected tool name, or an unauditable call.

Only tools declared `readOnly: true` cross this bridge today. Mutating provider tools remain hidden
until the confirmation policy can be preserved end to end. Do not create a plugin-owned MCP process
or pass credentials, workspace IDs, user IDs, installation IDs, or secret references through tool
arguments.
