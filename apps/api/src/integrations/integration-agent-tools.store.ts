export type ConnectedAgentToolInstallation = {
  installationId: string;
  pluginKey: string;
  pluginVersion: string;
  workspaceId: string;
};

export interface IntegrationAgentToolsStore {
  listConnected(
    workspaceId: string,
    userId: string,
  ): Promise<readonly ConnectedAgentToolInstallation[] | null>;
}
