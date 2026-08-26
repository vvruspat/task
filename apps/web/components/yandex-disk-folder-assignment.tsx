"use client";

import type { IntegrationCatalogItem, YandexDiskFolderAssignment } from "@task/api-client";
import { Button, Flex, Text, TextField } from "@task/ui";
import { ExternalLink, FolderOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import { isApiFailure } from "../lib/workspace-contracts";
import {
  isIntegrationCatalog,
  isYandexDiskFolderAssignment,
  isYandexDiskFolderAssignmentResponse,
} from "../lib/workspace-integrations";

export function YandexDiskFolderAssignmentControl({
  compact = false,
  targetId,
  targetType,
  workspaceId,
}: Readonly<{
  compact?: boolean;
  targetId: string;
  targetType: "project" | "task";
  workspaceId: string;
}>): ReactNode {
  const { t } = useI18n();
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [folder, setFolder] = useState<YandexDiskFolderAssignment | null>(null);
  const [path, setPath] = useState("disk:/");
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const catalogResponse = await fetch(
        `/api/workspace/integrations?workspaceId=${encodeURIComponent(workspaceId)}`,
        { cache: "no-store" },
      );
      const catalogBody: unknown = await catalogResponse.json();
      if (!catalogResponse.ok || !isIntegrationCatalog(catalogBody)) {
        throw new Error(t("integrations.yandexFolderLoadError"));
      }
      const integration = findConnectedYandexDisk(catalogBody);
      if (integration === null) {
        setAvailable(false);
        setIntegrationId(null);
        setFolder(null);
        setError(null);
        return;
      }
      setAvailable(true);
      setIntegrationId(integration.id);
      const query = new URLSearchParams({
        integrationId: integration.id,
        targetId,
        targetType,
        workspaceId,
      });
      const folderResponse = await fetch(
        `/api/workspace/integrations/yandex-disk/folder?${query.toString()}`,
        { cache: "no-store" },
      );
      const folderBody: unknown = await folderResponse.json();
      if (!folderResponse.ok || !isYandexDiskFolderAssignmentResponse(folderBody)) {
        throw new Error(
          isApiFailure(folderBody) ? folderBody.error : t("integrations.yandexFolderLoadError"),
        );
      }
      setFolder(folderBody.folder);
      if (folderBody.folder !== null) setPath(folderBody.folder.path);
      setError(null);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error ? loadError.message : t("integrations.yandexFolderLoadError"),
      );
    } finally {
      setLoading(false);
    }
  }, [t, targetId, targetType, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectFolder = async (): Promise<void> => {
    if (integrationId === null || pending || path.trim().length === 0) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspace/integrations/yandex-disk/folder", {
        body: JSON.stringify({
          integrationId,
          path: path.trim(),
          targetId,
          targetType,
          workspaceId,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const body: unknown = await response.json();
      if (!response.ok || !isYandexDiskFolderAssignment(body)) {
        throw new Error(isApiFailure(body) ? body.error : t("integrations.yandexFolderSaveError"));
      }
      setFolder(body);
      setPath(body.path);
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error ? saveError.message : t("integrations.yandexFolderSaveError"),
      );
    } finally {
      setPending(false);
    }
  };

  if (loading) return <Text color="gray">{t("common.loading")}</Text>;
  if (!available) return null;

  return (
    <Flex direction="column" gap="2" align="start">
      <Flex align="center" gap="2" wrap="wrap">
        <Text color="gray" size="2">
          {folder === null ? t("integrations.yandexFolderNotAssigned") : t("files.yandexDisk")}
        </Text>
        {folder?.webUrl !== null && folder?.webUrl !== undefined && (
          <Text asChild size="2" weight="medium">
            <a href={folder.webUrl} rel="noreferrer" target="_blank">
              {folder.name} <ExternalLink size={12} />
            </a>
          </Text>
        )}
      </Flex>
      <Flex
        direction={compact ? "column" : "row"}
        gap="2"
        align={compact ? "start" : "center"}
        wrap="wrap"
      >
        <TextField.Root
          aria-label={t("integrations.yandexFolderPath")}
          disabled={pending}
          placeholder={t("integrations.yandexFolderPathPlaceholder")}
          size="1"
          value={path}
          onChange={(event) => setPath(event.target.value)}
        />
        <Button
          disabled={pending || path.trim().length === 0}
          size="1"
          type="button"
          variant="soft"
          onClick={() => void selectFolder()}
        >
          <FolderOpen size={14} />
          {pending
            ? t("integrations.savingFolder")
            : folder === null
              ? t("integrations.assignFolder")
              : t("integrations.changeFolder")}
        </Button>
      </Flex>
      {error !== null && (
        <Text color="red" size="1">
          {error}
        </Text>
      )}
    </Flex>
  );
}

function findConnectedYandexDisk(
  catalog: readonly IntegrationCatalogItem[],
): { id: string } | null {
  const item = catalog.find(
    (candidate) =>
      candidate.pluginKey === "yandex-disk" && candidate.installation?.status === "connected",
  );
  return item?.installation === null || item?.installation === undefined
    ? null
    : { id: item.installation.id };
}
