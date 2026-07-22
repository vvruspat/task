import type { IntegrationPlugin } from "@task/integration-sdk";

const pluginKeyPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const agentToolNamespacePattern = /^[a-z][a-z0-9_]*$/u;
const agentToolNamePattern = /^[a-z][a-z0-9_]*$/u;
const maxAgentToolNamespaceLength = 32;
const maxAgentToolNameLength = 32;
const maxQualifiedAgentToolNameLength = 64;
const maxAgentToolDescriptionLength = 1_000;

export class IntegrationPluginRegistry {
  private readonly pluginsByKey: ReadonlyMap<string, IntegrationPlugin>;

  constructor(plugins: readonly IntegrationPlugin[]) {
    const pluginsByKey = new Map<string, IntegrationPlugin>();
    const pluginKeyByAgentToolNamespace = new Map<string, string>();
    for (const plugin of plugins) {
      validatePlugin(plugin);
      if (pluginsByKey.has(plugin.manifest.pluginKey)) {
        throw new Error(`Duplicate integration plugin key: ${plugin.manifest.pluginKey}`);
      }
      const agentToolCapability = plugin.manifest.capabilities.find(
        (capability) => capability.kind === "agent_tool_provider",
      );
      if (agentToolCapability?.kind === "agent_tool_provider") {
        const existingPluginKey = pluginKeyByAgentToolNamespace.get(agentToolCapability.namespace);
        if (existingPluginKey !== undefined) {
          throw new Error(
            `Duplicate integration agent tool namespace ${agentToolCapability.namespace}: ${existingPluginKey} and ${plugin.manifest.pluginKey}.`,
          );
        }
        pluginKeyByAgentToolNamespace.set(agentToolCapability.namespace, plugin.manifest.pluginKey);
      }
      pluginsByKey.set(plugin.manifest.pluginKey, plugin);
    }
    this.pluginsByKey = pluginsByKey;
  }

  list(): readonly IntegrationPlugin[] {
    return [...this.pluginsByKey.values()].sort((left, right) =>
      left.manifest.name.localeCompare(right.manifest.name),
    );
  }

  get(pluginKey: string): IntegrationPlugin | null {
    return this.pluginsByKey.get(pluginKey) ?? null;
  }
}

function validatePlugin(plugin: IntegrationPlugin): void {
  const { manifest } = plugin;
  if (!pluginKeyPattern.test(manifest.pluginKey)) {
    throw new Error(`Invalid integration plugin key: ${manifest.pluginKey}`);
  }
  if (manifest.name.trim().length === 0) {
    throw new Error(`Integration plugin ${manifest.pluginKey} must have a name.`);
  }
  if (manifest.pluginVersion.trim().length === 0) {
    throw new Error(`Integration plugin ${manifest.pluginKey} must have a version.`);
  }
  const capabilityKinds = new Set<string>();
  for (const capability of manifest.capabilities) {
    if (capabilityKinds.has(capability.kind)) {
      throw new Error(
        `Integration plugin ${manifest.pluginKey} declares ${capability.kind} more than once.`,
      );
    }
    capabilityKinds.add(capability.kind);
    if (
      capability.kind === "agent_tool_provider" &&
      (!agentToolNamespacePattern.test(capability.namespace) ||
        capability.namespace.length > maxAgentToolNamespaceLength)
    ) {
      throw new Error(
        `Integration plugin ${manifest.pluginKey} has invalid agent tool namespace ${capability.namespace}.`,
      );
    }
  }
  validateAgentTools(plugin);
}

function validateAgentTools(plugin: IntegrationPlugin): void {
  const provider = plugin.handlers?.agentTools;
  if (provider === undefined) return;
  const capability = plugin.manifest.capabilities.find(
    (candidate) => candidate.kind === "agent_tool_provider",
  );
  if (capability?.kind !== "agent_tool_provider") {
    throw new Error(
      `Integration plugin ${plugin.manifest.pluginKey} provides agent tools without declaring the capability.`,
    );
  }
  if (provider.tools.length === 0) {
    throw new Error(
      `Integration plugin ${plugin.manifest.pluginKey} agent tool provider must declare at least one tool.`,
    );
  }
  const names = new Set<string>();
  for (const tool of provider.tools) {
    if (
      !agentToolNamePattern.test(tool.name) ||
      tool.name.length > maxAgentToolNameLength ||
      `${capability.namespace}_${tool.name}`.length > maxQualifiedAgentToolNameLength
    ) {
      throw new Error(
        `Integration plugin ${plugin.manifest.pluginKey} has invalid agent tool name ${tool.name}.`,
      );
    }
    if (names.has(tool.name)) {
      throw new Error(
        `Integration plugin ${plugin.manifest.pluginKey} declares agent tool ${tool.name} more than once.`,
      );
    }
    if (
      tool.description.trim().length === 0 ||
      tool.description.length > maxAgentToolDescriptionLength
    ) {
      throw new Error(
        `Integration plugin ${plugin.manifest.pluginKey} agent tool ${tool.name} needs a description.`,
      );
    }
    if (tool.inputSchema.type !== "object" || tool.inputSchema.additionalProperties !== false) {
      throw new Error(
        `Integration plugin ${plugin.manifest.pluginKey} agent tool ${tool.name} needs a closed object schema.`,
      );
    }
    const required = tool.inputSchema.required ?? [];
    if (
      new Set(required).size !== required.length ||
      required.some((key) => tool.inputSchema.properties[key] === undefined)
    ) {
      throw new Error(
        `Integration plugin ${plugin.manifest.pluginKey} agent tool ${tool.name} has invalid required properties.`,
      );
    }
    names.add(tool.name);
  }
}
