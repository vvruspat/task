import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type {
  IntegrationAgentToolDefinition,
  IntegrationAgentToolExecutionContext,
  IntegrationAgentToolProvider,
} from "@task/integration-sdk";
import type {
  ConnectedAgentToolInstallation,
  IntegrationAgentToolsStore,
} from "./integration-agent-tools.store.js";
import { IntegrationPluginRegistry } from "./integration-plugin.registry.js";
import { TypeOrmIntegrationAgentToolsStore } from "./typeorm-integration-agent-tools.store.js";

export type WorkspaceIntegrationAgentToolCall = {
  arguments: Readonly<Record<string, unknown>>;
  name: string;
};

type ResolvedIntegrationAgentToolProvider = {
  context: IntegrationAgentToolExecutionContext;
  namespace: string;
  provider: IntegrationAgentToolProvider;
};

@Injectable()
export class IntegrationAgentToolsService {
  constructor(
    @Inject(TypeOrmIntegrationAgentToolsStore)
    private readonly store: IntegrationAgentToolsStore,
    @Inject(IntegrationPluginRegistry)
    private readonly registry: IntegrationPluginRegistry,
  ) {}

  async listTools(
    workspaceId: string,
    userId: string,
  ): Promise<readonly IntegrationAgentToolDefinition[]> {
    const providers = await this.resolveProviders(workspaceId, userId);
    if (providers === null) return [];
    const tools = providers.flatMap(({ namespace, provider }) =>
      provider.tools.map((tool) => ({
        ...tool,
        name: qualifyIntegrationAgentToolName(namespace, tool.name),
      })),
    );
    const names = new Set<string>();
    for (const tool of tools) {
      if (names.has(tool.name)) {
        throw new Error(`Duplicate workspace integration agent tool ${tool.name}.`);
      }
      names.add(tool.name);
    }
    return tools.sort((left, right) => left.name.localeCompare(right.name));
  }

  async executeTool(
    call: WorkspaceIntegrationAgentToolCall,
    workspaceId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const providers = await this.resolveProviders(workspaceId, userId);
    if (providers === null) {
      throw new ForbiddenException("Current user cannot use workspace integration tools.");
    }
    for (const resolved of providers) {
      const tool = resolved.provider.tools.find(
        (candidate) =>
          qualifyIntegrationAgentToolName(resolved.namespace, candidate.name) === call.name,
      );
      if (tool === undefined) continue;
      return await resolved.provider.execute(
        { arguments: call.arguments, name: tool.name },
        resolved.context,
      );
    }
    throw new BadRequestException(`Unsupported workspace integration agent tool: ${call.name}`);
  }

  private async resolveProviders(
    workspaceId: string,
    userId: string,
  ): Promise<readonly ResolvedIntegrationAgentToolProvider[] | null> {
    const installations = await this.store.listConnected(workspaceId, userId);
    if (installations === null) return null;
    return installations.flatMap((installation) => this.resolveProvider(installation, userId));
  }

  private resolveProvider(
    installation: ConnectedAgentToolInstallation,
    userId: string,
  ): readonly ResolvedIntegrationAgentToolProvider[] {
    const plugin = this.registry.get(installation.pluginKey);
    if (
      plugin === null ||
      plugin.manifest.pluginVersion !== installation.pluginVersion ||
      plugin.handlers?.agentTools === undefined
    ) {
      return [];
    }
    const capability = plugin.manifest.capabilities.find(
      (candidate) => candidate.kind === "agent_tool_provider",
    );
    if (capability?.kind !== "agent_tool_provider") return [];
    return [
      {
        context: {
          installationId: installation.installationId,
          pluginKey: installation.pluginKey,
          pluginVersion: installation.pluginVersion,
          userId,
          workspaceId: installation.workspaceId,
        },
        namespace: capability.namespace,
        provider: plugin.handlers.agentTools,
      },
    ];
  }
}

export function qualifyIntegrationAgentToolName(namespace: string, name: string): string {
  return `${namespace}_${name}`;
}
