"use client";

import type { GoogleDriveFolderAssignment, IntegrationCatalogItem } from "@task/api-client";
import { Button, Flex, Text } from "@task/ui";
import { ExternalLink, FolderOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { selectGoogleDriveFolder } from "../lib/google-drive-picker";
import { useI18n } from "../lib/i18n/i18n";
import { isApiFailure } from "../lib/workspace-contracts";
import {
  isGoogleDriveFolderAssignment,
  isGoogleDriveFolderAssignmentResponse,
  isGoogleDrivePickerSession,
  isIntegrationCatalog,
} from "../lib/workspace-integrations";

export function GoogleDriveFolderAssignmentControl({
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
  const [folder, setFolder] = useState<GoogleDriveFolderAssignment | null>(null);
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
        throw new Error(t("integrations.folderLoadError"));
      }
      const integration = findConnectedGoogleDrive(catalogBody);
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
        `/api/workspace/integrations/google-drive/folder?${query.toString()}`,
        { cache: "no-store" },
      );
      const folderBody: unknown = await folderResponse.json();
      if (!folderResponse.ok || !isGoogleDriveFolderAssignmentResponse(folderBody)) {
        throw new Error(
          isApiFailure(folderBody) ? folderBody.error : t("integrations.folderLoadError"),
        );
      }
      setFolder(folderBody.folder);
      setError(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : t("integrations.folderLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t, targetId, targetType, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectFolder = async (): Promise<void> => {
    if (integrationId === null || pending) return;
    setPending(true);
    setError(null);
    try {
      const sessionResponse = await fetch(
        "/api/workspace/integrations/google-drive/picker-session",
        {
          body: JSON.stringify({ integrationId, workspaceId }),
          cache: "no-store",
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const sessionBody: unknown = await sessionResponse.json();
      if (!sessionResponse.ok || !isGoogleDrivePickerSession(sessionBody)) {
        throw new Error(
          isApiFailure(sessionBody) ? sessionBody.error : t("integrations.folderSaveError"),
        );
      }
      const folderId = await selectGoogleDriveFolder(sessionBody);
      if (folderId === null) return;
      const saveResponse = await fetch("/api/workspace/integrations/google-drive/folder", {
        body: JSON.stringify({
          folderId,
          integrationId,
          targetId,
          targetType,
          workspaceId,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const saveBody: unknown = await saveResponse.json();
      if (!saveResponse.ok || !isGoogleDriveFolderAssignment(saveBody)) {
        throw new Error(
          isApiFailure(saveBody) ? saveBody.error : t("integrations.folderSaveError"),
        );
      }
      setFolder(saveBody);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : t("integrations.folderSaveError"));
    } finally {
      setPending(false);
    }
  };

  if (loading) return <Text color="gray">{t("common.loading")}</Text>;
  if (!available) return null;

  return (
    <Flex direction={compact ? "column" : "row"} gap="2" align={compact ? "start" : "center"}>
      <Flex align="center" gap="2" wrap="wrap">
        {folder?.webUrl === null || folder?.webUrl === undefined ? (
          <Text color="gray" size="2">
            {folder === null ? t("integrations.folderNotAssigned") : folder.name}
          </Text>
        ) : (
          <Text asChild size="2" weight="medium">
            <a href={folder.webUrl} rel="noreferrer" target="_blank">
              {folder.name} <ExternalLink size={12} />
            </a>
          </Text>
        )}
        <Button disabled={pending} size="1" type="button" variant="soft" onClick={selectFolder}>
          <FolderOpen size={14} />
          {pending
            ? t("integrations.openingPicker")
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

function findConnectedGoogleDrive(
  catalog: readonly IntegrationCatalogItem[],
): { id: string } | null {
  const item = catalog.find(
    (candidate) =>
      candidate.pluginKey === "google-drive" && candidate.installation?.status === "connected",
  );
  return item?.installation === null || item?.installation === undefined
    ? null
    : { id: item.installation.id };
}
