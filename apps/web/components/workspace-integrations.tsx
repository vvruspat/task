"use client";

import type { IntegrationCatalogItem } from "@task/api-client";
import { Badge, Button, Card, Flex, Text, TextField } from "@task/ui";
import { ChevronRight, FolderOpen, Plug, Unplug } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { selectGoogleDriveFolder } from "../lib/google-drive-picker";
import { useI18n } from "../lib/i18n/i18n";
import { isApiFailure } from "../lib/workspace-contracts";
import {
  isGoogleDrivePickerSession,
  isGoogleDriveRootFolder,
  isIntegrationCatalog,
  isTelegramConnectToken,
  isWorkspaceIntegration,
  isYandexDiskRootFolder,
  readGoogleDriveRootFolderConfig,
  readYandexDiskRootFolderConfig,
} from "../lib/workspace-integrations";
import { workspaceTelegramChatSettingsHref } from "../lib/workspace-url";

export function WorkspaceIntegrations({
  workspaceId,
  workspaceSlug,
}: Readonly<{ workspaceId: string; workspaceSlug: string }>): ReactNode {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState<IntegrationCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingPluginKey, setPendingPluginKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [telegramConnectCommand, setTelegramConnectCommand] = useState<string | null>(null);
  const [yandexRootPath, setYandexRootPath] = useState("disk:/tAsk");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setTelegramConnectCommand(null);
    try {
      const response = await fetch(
        `/api/workspace/integrations?workspaceId=${encodeURIComponent(workspaceId)}`,
        { cache: "no-store" },
      );
      const body: unknown = await response.json();
      if (!response.ok || isApiFailure(body)) {
        setError(isApiFailure(body) ? body.error : t("integrations.loadError"));
      } else if (isIntegrationCatalog(body)) {
        setCatalog(body);
        const yandexIntegration = body.find((item) => item.pluginKey === "yandex-disk");
        if (
          yandexIntegration?.installation !== null &&
          yandexIntegration?.installation !== undefined
        ) {
          const configuredRoot = readYandexDiskRootFolderConfig(yandexIntegration.installation);
          if (configuredRoot !== null) setYandexRootPath(configuredRoot.path);
        }
        setError(null);
      } else {
        setError(t("workspace.invalidResponse"));
      }
    } catch (_error: unknown) {
      setError(t("integrations.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const install = async (pluginKey: string): Promise<void> => {
    setPendingPluginKey(pluginKey);
    try {
      const response = await fetch("/api/workspace/integrations", {
        body: JSON.stringify({ pluginKey, workspaceId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body: unknown = await response.json();
      if (!response.ok || isApiFailure(body)) {
        setError(isApiFailure(body) ? body.error : t("integrations.enableError"));
      } else if (isWorkspaceIntegration(body)) {
        setCatalog((current) =>
          current.map((item) =>
            item.pluginKey === body.pluginKey ? { ...item, installation: body } : item,
          ),
        );
        setError(null);
      }
    } catch (_error: unknown) {
      setError(t("integrations.enableError"));
    } finally {
      setPendingPluginKey(null);
    }
  };

  const uninstall = async (item: IntegrationCatalogItem): Promise<void> => {
    if (item.installation === null) return;
    setPendingPluginKey(item.pluginKey);
    try {
      const response = await fetch("/api/workspace/integrations", {
        body: JSON.stringify({ integrationId: item.installation.id, workspaceId }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      });
      const body: unknown = await response.json();
      if (!response.ok || isApiFailure(body)) {
        setError(isApiFailure(body) ? body.error : t("integrations.removeError"));
      } else if (isWorkspaceIntegration(body)) {
        setCatalog((current) =>
          current.map((candidate) =>
            candidate.pluginKey === item.pluginKey
              ? { ...candidate, installation: null }
              : candidate,
          ),
        );
        setError(null);
      }
    } catch (_error: unknown) {
      setError(t("integrations.removeError"));
    } finally {
      setPendingPluginKey(null);
    }
  };

  const connectCloudDrive = async (item: IntegrationCatalogItem): Promise<void> => {
    if (item.installation === null) return;
    setPendingPluginKey(item.pluginKey);
    try {
      const response = await fetch("/api/workspace/integrations/connect", {
        body: JSON.stringify({
          integrationId: item.installation.id,
          pluginKey: item.pluginKey,
          workspaceId,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body: unknown = await response.json();
      if (!response.ok || isApiFailure(body)) {
        setError(isApiFailure(body) ? body.error : t("integrations.connectError"));
      } else if (isGoogleDriveAuthorizationStart(body)) {
        window.location.assign(body.authorizationUrl);
      } else {
        setError(t("workspace.invalidResponse"));
      }
    } catch (_error: unknown) {
      setError(t("integrations.connectError"));
    } finally {
      setPendingPluginKey(null);
    }
  };

  const configureYandexDiskRoot = async (item: IntegrationCatalogItem): Promise<void> => {
    if (item.installation === null || yandexRootPath.trim().length === 0) return;
    setPendingPluginKey(item.pluginKey);
    try {
      const response = await fetch("/api/workspace/integrations/yandex-disk/root-folder", {
        body: JSON.stringify({
          integrationId: item.installation.id,
          path: yandexRootPath.trim(),
          workspaceId,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const body: unknown = await response.json();
      if (!response.ok || isApiFailure(body)) {
        setError(isApiFailure(body) ? body.error : t("integrations.yandexRootFolderError"));
        return;
      }
      if (!isYandexDiskRootFolder(body)) {
        setError(t("workspace.invalidResponse"));
        return;
      }
      setYandexRootPath(body.path);
      setCatalog((current) =>
        current.map((candidate) =>
          candidate.pluginKey === item.pluginKey && candidate.installation !== null
            ? {
                ...candidate,
                installation: {
                  ...candidate.installation,
                  config: { ...candidate.installation.config, rootFolder: body },
                },
              }
            : candidate,
        ),
      );
      setError(null);
    } catch (_error: unknown) {
      setError(t("integrations.yandexRootFolderError"));
    } finally {
      setPendingPluginKey(null);
    }
  };

  const configureGoogleDriveRoot = async (item: IntegrationCatalogItem): Promise<void> => {
    if (item.installation === null) return;
    setPendingPluginKey(item.pluginKey);
    try {
      const sessionResponse = await fetch(
        "/api/workspace/integrations/google-drive/picker-session",
        {
          body: JSON.stringify({ integrationId: item.installation.id, workspaceId }),
          cache: "no-store",
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const sessionBody: unknown = await sessionResponse.json();
      if (!sessionResponse.ok || isApiFailure(sessionBody)) {
        setError(isApiFailure(sessionBody) ? sessionBody.error : t("integrations.rootFolderError"));
        return;
      }
      if (!isGoogleDrivePickerSession(sessionBody)) {
        setError(t("workspace.invalidResponse"));
        return;
      }
      const folderId = await selectGoogleDriveFolder(sessionBody);
      if (folderId === null) return;
      const saveResponse = await fetch("/api/workspace/integrations/google-drive/root-folder", {
        body: JSON.stringify({
          folderId,
          integrationId: item.installation.id,
          workspaceId,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const saveBody: unknown = await saveResponse.json();
      if (!saveResponse.ok || isApiFailure(saveBody)) {
        setError(isApiFailure(saveBody) ? saveBody.error : t("integrations.rootFolderError"));
        return;
      }
      if (!isGoogleDriveRootFolder(saveBody)) {
        setError(t("workspace.invalidResponse"));
        return;
      }
      setCatalog((current) =>
        current.map((candidate) =>
          candidate.pluginKey === item.pluginKey && candidate.installation !== null
            ? {
                ...candidate,
                installation: {
                  ...candidate.installation,
                  config: { ...candidate.installation.config, rootFolder: saveBody },
                },
              }
            : candidate,
        ),
      );
      setError(null);
    } catch (_error: unknown) {
      setError(t("integrations.rootFolderError"));
    } finally {
      setPendingPluginKey(null);
    }
  };

  const createTelegramConnectCommand = async (item: IntegrationCatalogItem): Promise<void> => {
    if (item.installation === null) return;
    setPendingPluginKey(item.pluginKey);
    try {
      const response = await fetch("/api/workspace/integrations/telegram/connect-token", {
        body: JSON.stringify({ integrationId: item.installation.id, workspaceId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body: unknown = await response.json();
      if (!response.ok || isApiFailure(body)) {
        setError(isApiFailure(body) ? body.error : t("integrations.telegramConnectError"));
        return;
      }
      if (!isTelegramConnectToken(body)) {
        setError(t("workspace.invalidResponse"));
        return;
      }
      setTelegramConnectCommand(body.command);
      setCatalog((current) =>
        current.map((candidate) =>
          candidate.pluginKey === item.pluginKey && candidate.installation !== null
            ? {
                ...candidate,
                installation:
                  candidate.installation.status === "connected"
                    ? candidate.installation
                    : { ...candidate.installation, status: "authorizing" },
              }
            : candidate,
        ),
      );
      setError(null);
    } catch (_error: unknown) {
      setError(t("integrations.telegramConnectError"));
    } finally {
      setPendingPluginKey(null);
    }
  };

  if (loading) return <Text color="gray">{t("integrations.loading")}</Text>;

  return (
    <Flex direction="column" gap="3">
      {error !== null && <Text color="red">{error}</Text>}
      {catalog.map((item) => {
        const installed = item.installation !== null;
        const connected = item.installation?.status === "connected";
        const canConnectCloudDrive =
          (item.pluginKey === "google-drive" || item.pluginKey === "yandex-disk") &&
          installed &&
          !connected;
        const canConnectTelegram = item.pluginKey === "telegram" && installed;
        const canConfigureGoogleDrive = item.pluginKey === "google-drive" && connected;
        const canConfigureYandexDisk = item.pluginKey === "yandex-disk" && connected;
        const telegramConnections =
          item.pluginKey === "telegram"
            ? item.connections.filter((connection) => connection.status === "connected")
            : [];
        const rootFolder =
          item.installation === null
            ? null
            : item.pluginKey === "yandex-disk"
              ? readYandexDiskRootFolderConfig(item.installation)
              : readGoogleDriveRootFolderConfig(item.installation);
        const health = item.health;
        const subscriptionIssues =
          health === null ? 0 : health.subscriptions.expiredCount + health.subscriptions.errorCount;
        const pending = pendingPluginKey === item.pluginKey;
        return (
          <Card key={item.pluginKey}>
            <Flex align="center" gap="3" justify="between" wrap="wrap">
              <Flex direction="column" gap="1">
                <Flex align="center" gap="2">
                  <Text weight="bold">{item.name}</Text>
                  <Badge color={connected ? "green" : installed ? "amber" : "gray"}>
                    {connected
                      ? t("integrations.connected")
                      : installed
                        ? t("integrations.enabled")
                        : t("integrations.notEnabled")}
                  </Badge>
                </Flex>
                <Text color="gray" size="2">
                  {item.description}
                </Text>
                {health !== null && (
                  <Flex align="center" gap="2" wrap="wrap">
                    <Badge
                      color={
                        health.status === "healthy"
                          ? "green"
                          : health.status === "degraded"
                            ? "amber"
                            : health.status === "error"
                              ? "red"
                              : "gray"
                      }
                    >
                      {health.status === "healthy"
                        ? t("integrations.healthHealthy")
                        : health.status === "degraded"
                          ? t("integrations.healthDegraded")
                          : health.status === "error"
                            ? t("integrations.healthError")
                            : t("integrations.healthInactive")}
                    </Badge>
                    <Text color="gray" size="1">
                      {t("integrations.healthDiagnostics", {
                        activeSubscriptions: health.subscriptions.activeCount,
                        deadDeliveries: health.deliveries.deadCount,
                        failedWebhooks: health.webhooks.failedCount,
                        pendingDeliveries: health.deliveries.pendingCount,
                        subscriptionIssues,
                      })}
                    </Text>
                  </Flex>
                )}
                {(canConfigureGoogleDrive || canConfigureYandexDisk) && (
                  <Text color="gray" size="2">
                    {rootFolder === null
                      ? t("integrations.rootFolderMissing")
                      : t("integrations.rootFolderSelected", { name: rootFolder.name })}
                  </Text>
                )}
                {item.pluginKey === "telegram" && telegramConnections.length > 0 && (
                  <Flex direction="column" gap="1">
                    <Text color="gray" size="2">
                      {t("integrations.telegramConnectedChats", {
                        count: telegramConnections.length,
                      })}
                    </Text>
                    <Flex direction="column" gap="1" align="start">
                      {telegramConnections.map((connection) => (
                        <Button asChild key={connection.id} size="1" variant="soft" color="gray">
                          <Link
                            href={workspaceTelegramChatSettingsHref(workspaceSlug, connection.id)}
                          >
                            {connection.displayName ?? connection.providerAccountId}
                            <ChevronRight size={13} />
                          </Link>
                        </Button>
                      ))}
                    </Flex>
                  </Flex>
                )}
                {canConnectTelegram && telegramConnectCommand !== null && (
                  <Flex direction="column" gap="1">
                    <Text color="gray" size="2">
                      {t("integrations.telegramConnectInstruction")}
                    </Text>
                    <Text size="2" weight="bold">
                      {telegramConnectCommand}
                    </Text>
                  </Flex>
                )}
              </Flex>
              {canConnectCloudDrive ? (
                <Button
                  disabled={pendingPluginKey !== null}
                  onClick={() => void connectCloudDrive(item)}
                  size="1"
                  type="button"
                >
                  <Plug size={14} />
                  {pending ? t("integrations.connecting") : t("integrations.connect")}
                </Button>
              ) : canConnectTelegram ? (
                <Button
                  disabled={pendingPluginKey !== null}
                  onClick={() => void createTelegramConnectCommand(item)}
                  size="1"
                  type="button"
                >
                  <Plug size={14} />
                  {pending
                    ? t("integrations.telegramPreparing")
                    : telegramConnections.length > 0
                      ? t("integrations.telegramConnectAnother")
                      : t("integrations.telegramConnect")}
                </Button>
              ) : canConfigureGoogleDrive ? (
                <Button
                  disabled={pendingPluginKey !== null}
                  onClick={() => void configureGoogleDriveRoot(item)}
                  size="1"
                  type="button"
                  variant="soft"
                >
                  <FolderOpen size={14} />
                  {pending
                    ? t("integrations.openingPicker")
                    : rootFolder === null
                      ? t("integrations.selectRootFolder")
                      : t("integrations.changeRootFolder")}
                </Button>
              ) : canConfigureYandexDisk ? (
                <Flex align="center" gap="2" wrap="wrap">
                  <TextField.Root
                    aria-label={t("integrations.yandexFolderPath")}
                    disabled={pendingPluginKey !== null}
                    placeholder={t("integrations.yandexRootPathPlaceholder")}
                    size="1"
                    value={yandexRootPath}
                    onChange={(event) => setYandexRootPath(event.target.value)}
                  />
                  <Button
                    disabled={pendingPluginKey !== null || yandexRootPath.trim().length === 0}
                    onClick={() => void configureYandexDiskRoot(item)}
                    size="1"
                    type="button"
                    variant="soft"
                  >
                    <FolderOpen size={14} />
                    {pending
                      ? t("integrations.savingFolder")
                      : rootFolder === null
                        ? t("integrations.selectRootFolder")
                        : t("integrations.changeRootFolder")}
                  </Button>
                </Flex>
              ) : installed && !connected ? (
                <Button
                  color="red"
                  disabled={pendingPluginKey !== null}
                  onClick={() => void uninstall(item)}
                  size="1"
                  type="button"
                  variant="soft"
                >
                  <Unplug size={14} />
                  {pending ? t("integrations.removing") : t("integrations.remove")}
                </Button>
              ) : !installed ? (
                <Button
                  disabled={pendingPluginKey !== null}
                  onClick={() => void install(item.pluginKey)}
                  size="1"
                  type="button"
                >
                  <Plug size={14} />
                  {pending ? t("integrations.enabling") : t("integrations.enable")}
                </Button>
              ) : null}
            </Flex>
          </Card>
        );
      })}
    </Flex>
  );
}

function isGoogleDriveAuthorizationStart(value: unknown): value is { authorizationUrl: string } {
  if (typeof value !== "object" || value === null || !("authorizationUrl" in value)) return false;
  return (
    typeof value.authorizationUrl === "string" && value.authorizationUrl.startsWith("https://")
  );
}
