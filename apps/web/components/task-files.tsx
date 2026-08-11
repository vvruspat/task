"use client";

import type { TaskAttachment, TaskSummary } from "@task/api-client";
import { Badge, Button, Card, Flex, Text } from "@task/ui";
import { ExternalLink, File, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../lib/i18n/i18n";

export function TaskFiles({ task }: Readonly<{ task: TaskSummary }>): ReactNode {
  const { t } = useI18n();
  const [files, setFiles] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        projectId: task.projectId,
        workspaceId: task.workspaceId,
      });
      const response = await fetch(
        `/api/workspace/tasks/${encodeURIComponent(task.id)}/attachments?${query.toString()}`,
        { cache: "no-store" },
      );
      const value: unknown = await response.json();
      if (!response.ok || !isTaskAttachmentArray(value)) {
        throw new Error(readResponseError(value, t("files.loadError")));
      }
      setFiles(value);
      setError(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : t("files.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t, task.id, task.projectId, task.workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="2">
          <Text weight="bold">{t("files.title")}</Text>
          <Button
            aria-label={t("files.refresh")}
            disabled={loading}
            size="1"
            type="button"
            variant="ghost"
            onClick={() => void load()}
          >
            <RefreshCw size={14} />
            {t("files.refresh")}
          </Button>
        </Flex>
        {loading && files.length === 0 && <Text color="gray">{t("common.loading")}</Text>}
        {!loading && files.length === 0 && error === null && (
          <Text color="gray" size="2">
            {t("files.empty")}
          </Text>
        )}
        <Flex direction="column" gap="2">
          {files.map((file) => (
            <Flex align="center" gap="2" justify="between" key={`${file.source}:${file.id}`}>
              <Flex align="center" gap="2">
                <File size={15} />
                {file.url === null ? (
                  <Text size="2">{file.title ?? t("files.untitled")}</Text>
                ) : (
                  <Text asChild size="2" weight="medium">
                    <a href={file.url} rel="noreferrer" target="_blank">
                      {file.title ?? t("files.untitled")} <ExternalLink size={12} />
                    </a>
                  </Text>
                )}
              </Flex>
              {file.source === "google_drive" && (
                <Badge color="blue">{t("files.googleDrive")}</Badge>
              )}
            </Flex>
          ))}
        </Flex>
        {error !== null && (
          <Text color="red" size="1">
            {error}
          </Text>
        )}
      </Flex>
    </Card>
  );
}

function isTaskAttachmentArray(value: unknown): value is TaskAttachment[] {
  return Array.isArray(value) && value.every(isTaskAttachment);
}

function isTaskAttachment(value: unknown): value is TaskAttachment {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["workspaceId"] === "string" &&
    typeof value["targetId"] === "string" &&
    (value["targetType"] === "task" ||
      value["targetType"] === "project" ||
      value["targetType"] === "comment") &&
    (value["kind"] === "file" || value["kind"] === "link" || value["kind"] === "telegram_file") &&
    isNullableString(value["title"]) &&
    isNullableString(value["url"]) &&
    isNullableString(value["storageKey"]) &&
    isNullableString(value["telegramFileId"]) &&
    isNullableString(value["mimeType"]) &&
    isNullableString(value["sizeBytes"]) &&
    isNullableString(value["createdByUserId"]) &&
    isNullableString(value["externalResourceId"]) &&
    isNullableString(value["modifiedAt"]) &&
    isNullableString(value["providerResourceId"]) &&
    (value["source"] === "native" || value["source"] === "google_drive") &&
    typeof value["createdAt"] === "string"
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function readResponseError(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value["error"] === "string" ? value["error"] : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
