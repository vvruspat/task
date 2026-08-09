"use client";

import type { TelegramBrowserConnectPreview, TelegramBrowserConnectResult } from "@task/api-client";
import { Button, Card, Flex, Heading, Select, Text } from "@task/ui";
import { CheckCircle2, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import {
  isTelegramBrowserConnectPreview,
  isTelegramBrowserConnectResult,
} from "../lib/telegram-browser-connect";
import { isApiFailure } from "../lib/workspace-contracts";

export function TelegramBrowserConnect({ token }: Readonly<{ token: string }>): ReactNode {
  const { t } = useI18n();
  const [authData, setAuthData] = useState<string | null>(null);
  const [preview, setPreview] = useState<TelegramBrowserConnectPreview | null>(null);
  const [result, setResult] = useState<TelegramBrowserConnectResult | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const signedAuthData = window.location.search.slice(1);
    if (signedAuthData.length === 0) {
      setError(t("telegramConnect.invalidLink"));
      return;
    }
    setAuthData(signedAuthData);
    let active = true;
    void fetch(`/api/integrations/telegram/browser-connect/${encodeURIComponent(token)}`, {
      body: JSON.stringify({ action: "preview", authData: signedAuthData }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
      .then(async (response): Promise<void> => {
        const body: unknown = await response.json();
        if (!active) return;
        if (!response.ok || isApiFailure(body)) {
          setError(isApiFailure(body) ? body.error : t("telegramConnect.previewError"));
          return;
        }
        if (!isTelegramBrowserConnectPreview(body)) {
          setError(t("telegramConnect.invalidResponse"));
          return;
        }
        setPreview(body);
        if (body.mode === "connect_chat" && body.workspaces.length === 1) {
          setSelectedWorkspaceId(body.workspaces[0]?.id ?? "");
        }
      })
      .catch(() => {
        if (active) setError(t("telegramConnect.previewError"));
      });
    return () => {
      active = false;
    };
  }, [t, token]);

  const complete = async (): Promise<void> => {
    if (authData === null || preview === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/integrations/telegram/browser-connect/${encodeURIComponent(token)}`,
        {
          body: JSON.stringify({
            action: "complete",
            authData,
            ...(preview.mode === "connect_chat" ? { workspaceId: selectedWorkspaceId } : {}),
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const body: unknown = await response.json().catch((): null => null);
      if (!response.ok || isApiFailure(body)) {
        setError(isApiFailure(body) ? body.error : t("telegramConnect.completeError"));
      } else if (isTelegramBrowserConnectResult(body)) {
        setResult(body);
      } else {
        setError(t("telegramConnect.invalidResponse"));
      }
    } catch {
      setError(t("telegramConnect.completeError"));
    } finally {
      setSubmitting(false);
    }
  };

  const hasWorkspaceChoice = preview?.mode === "connect_chat" && preview.workspaces.length > 0;
  const canSubmit =
    preview !== null &&
    (preview.mode === "link_identity" || (hasWorkspaceChoice && selectedWorkspaceId.length > 0));

  return (
    <Flex minHeight="100vh" align="center" justify="center" p="6">
      <Card size="4" style={{ maxWidth: 520, width: "100%" }}>
        <Flex direction="column" gap="4" align="start">
          {result === null ? <MessageCircle size={28} /> : <CheckCircle2 size={28} />}
          <Heading size="6">
            {result === null ? t("telegramConnect.title") : t("telegramConnect.doneTitle")}
          </Heading>
          {result !== null ? (
            <>
              <Text>
                {t(`telegramConnect.done.${result.status}`, { workspace: result.workspace.name })}
              </Text>
              <Button onClick={() => window.close()}>{t("common.close")}</Button>
            </>
          ) : (
            <>
              {preview === null && error === null && (
                <Text color="gray">{t("common.loading")}</Text>
              )}
              {preview !== null && (
                <>
                  <Text>
                    {t("telegramConnect.chat", {
                      chat: preview.chatTitle ?? t("telegramConnect.unnamedChat"),
                    })}
                  </Text>
                  {preview.mode === "link_identity" && preview.workspace !== null && (
                    <Text>
                      {t("telegramConnect.existingWorkspace", {
                        workspace: preview.workspace.name,
                      })}
                    </Text>
                  )}
                  {preview.mode === "connect_chat" && preview.workspaces.length > 0 && (
                    <Flex direction="column" gap="2" width="100%">
                      <Text>{t("telegramConnect.selectWorkspace")}</Text>
                      <Select.Root
                        value={selectedWorkspaceId}
                        onValueChange={setSelectedWorkspaceId}
                      >
                        <Select.Trigger placeholder={t("telegramConnect.workspacePlaceholder")} />
                        <Select.Content>
                          {preview.workspaces.map((workspace) => (
                            <Select.Item key={workspace.id} value={workspace.id}>
                              {workspace.name}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </Flex>
                  )}
                  {preview.mode === "connect_chat" && preview.workspaces.length === 0 && (
                    <Text color="gray">{t("telegramConnect.noWorkspaces")}</Text>
                  )}
                  <Button disabled={!canSubmit || submitting} onClick={() => void complete()}>
                    {submitting ? t("telegramConnect.connecting") : t("telegramConnect.confirm")}
                  </Button>
                </>
              )}
              {error !== null && <Text color="red">{error}</Text>}
            </>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}
