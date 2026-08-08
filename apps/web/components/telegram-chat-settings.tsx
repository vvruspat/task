"use client";

import type { IntegrationCatalogItem, WorkspaceIntegrationConnection } from "@task/api-client";
import { Card, Flex, Switch, Text } from "@task/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import { useWorkspaceData } from "../lib/use-workspace-data";
import { isApiFailure } from "../lib/workspace-contracts";
import {
  isIntegrationCatalog,
  isWorkspaceIntegrationConnection,
} from "../lib/workspace-integrations";
import { workspacePageHref } from "../lib/workspace-url";

type SaveState = "idle" | "saving" | "saved";

export function TelegramChatSettings({
  connectionId,
}: Readonly<{ connectionId: string }>): ReactNode {
  const { t } = useI18n();
  const { data, loading: workspaceLoading } = useWorkspaceData();
  const [integration, setIntegration] = useState<IntegrationCatalogItem | null>(null);
  const [connection, setConnection] = useState<WorkspaceIntegrationConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const load = useCallback(async (): Promise<void> => {
    if (data === null) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/workspace/integrations?workspaceId=${encodeURIComponent(data.workspace.id)}`,
        { cache: "no-store" },
      );
      const body: unknown = await response.json();
      if (!response.ok || isApiFailure(body)) {
        setError(isApiFailure(body) ? body.error : t("integrations.loadError"));
        return;
      }
      if (!isIntegrationCatalog(body)) {
        setError(t("workspace.invalidResponse"));
        return;
      }
      const telegramIntegration = body.find((item) => item.pluginKey === "telegram") ?? null;
      const telegramConnection =
        telegramIntegration?.connections.find((item) => item.id === connectionId) ?? null;
      setIntegration(telegramIntegration);
      setConnection(telegramConnection);
      setError(telegramConnection === null ? t("integrations.telegramChatNotFound") : null);
    } catch (_error: unknown) {
      setError(t("integrations.loadError"));
    } finally {
      setLoading(false);
    }
  }, [connectionId, data, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateHistoryAccess = async (checked: boolean): Promise<void> => {
    if (
      data === null ||
      integration === null ||
      integration.installation === null ||
      connection === null
    ) {
      return;
    }
    const previous = connection;
    setConnection({
      ...connection,
      telegramSettings: { conversationHistoryAccess: checked },
    });
    setSaveState("saving");
    setError(null);
    try {
      const response = await fetch("/api/workspace/integrations/telegram/chat-settings", {
        body: JSON.stringify({
          connectionId: connection.id,
          conversationHistoryAccess: checked,
          integrationId: integration.installation.id,
          workspaceId: data.workspace.id,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const body: unknown = await response.json();
      if (!response.ok || isApiFailure(body)) {
        setConnection(previous);
        setError(
          isApiFailure(body) ? body.error : t("integrations.telegramHistoryAccessSaveError"),
        );
        setSaveState("idle");
        return;
      }
      if (!isWorkspaceIntegrationConnection(body)) {
        setConnection(previous);
        setError(t("workspace.invalidResponse"));
        setSaveState("idle");
        return;
      }
      setConnection(body);
      setSaveState("saved");
    } catch (_error: unknown) {
      setConnection(previous);
      setError(t("integrations.telegramHistoryAccessSaveError"));
      setSaveState("idle");
    }
  };

  if (workspaceLoading || loading) {
    return <Text color="gray">{t("integrations.loading")}</Text>;
  }

  const chatName = connection?.displayName ?? connection?.providerAccountId ?? "Telegram";
  const integrationsHref =
    data === null
      ? "/settings/integrations"
      : workspacePageHref(data.workspace.slug, "settings/integrations");

  return (
    <>
      <Flex direction="column" gap="2" align="start">
        <Link href={integrationsHref}>
          <Flex align="center" gap="1">
            <ArrowLeft size={14} />
            <Text size="2">{t("integrations.backToIntegrations")}</Text>
          </Flex>
        </Link>
        <div className="page-heading">
          <div>
            <h1>{chatName}</h1>
            <p>{t("integrations.telegramChatSettingsSubtitle")}</p>
          </div>
        </div>
      </Flex>
      {error !== null && <Text color="red">{error}</Text>}
      {connection !== null && (
        <Card className="panel">
          <Flex align="center" gap="4" justify="between">
            <Flex direction="column" gap="1">
              <Text weight="bold">{t("integrations.telegramHistoryAccess")}</Text>
              <Text color="gray" size="2">
                {t("integrations.telegramHistoryAccessDescription")}
              </Text>
              {saveState !== "idle" && (
                <Text color="gray" size="1">
                  {saveState === "saving" ? t("common.saving") : t("common.saved")}
                </Text>
              )}
            </Flex>
            <Switch
              aria-label={t("integrations.telegramHistoryAccess")}
              checked={connection.telegramSettings?.conversationHistoryAccess ?? false}
              disabled={saveState === "saving"}
              onCheckedChange={(checked) => void updateHistoryAccess(checked)}
            />
          </Flex>
        </Card>
      )}
    </>
  );
}
