import type { IntegrationPlugin } from "@task/integration-sdk";

const pluginKeyPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

export class IntegrationPluginRegistry {
  private readonly pluginsByKey: ReadonlyMap<string, IntegrationPlugin>;

  constructor(plugins: readonly IntegrationPlugin[]) {
    const pluginsByKey = new Map<string, IntegrationPlugin>();
    for (const plugin of plugins) {
      validatePlugin(plugin);
      if (pluginsByKey.has(plugin.manifest.pluginKey)) {
        throw new Error(`Duplicate integration plugin key: ${plugin.manifest.pluginKey}`);
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
  }
}
