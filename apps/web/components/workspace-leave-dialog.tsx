"use client";

import { AlertDialog, Button, Flex, Text } from "@task/ui";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useI18n } from "../lib/i18n/i18n";

export function WorkspaceLeaveDialog({
  memberId,
  onLeft,
  onOpenChange,
  open,
  workspaceId,
  workspaceName,
}: Readonly<{
  memberId: string;
  onLeft: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  workspaceId: string;
  workspaceName: string;
}>): ReactNode {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leaveWorkspace(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    const response = await fetch(
      `/api/workspace/members/${encodeURIComponent(memberId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      setError(await readError(response, t("workspace.leaveError")));
      setBusy(false);
      return;
    }
    onOpenChange(false);
    setBusy(false);
    onLeft();
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setBusy(false);
          setError(null);
        }
      }}
    >
      <AlertDialog.Content maxWidth="440px">
        <AlertDialog.Title>{t("workspace.leaveTitle")}</AlertDialog.Title>
        <AlertDialog.Description size="2">
          {t("workspace.leaveConfirm", { name: workspaceName })}
        </AlertDialog.Description>
        <Flex direction="column" gap="3" mt="4">
          {error !== null && (
            <Text color="red" size="2">
              {error}
            </Text>
          )}
          <Flex justify="end" gap="3">
            <AlertDialog.Cancel>
              <Button color="gray" disabled={busy} variant="soft">
                {t("common.cancel")}
              </Button>
            </AlertDialog.Cancel>
            <Button color="red" disabled={busy} onClick={() => void leaveWorkspace()}>
              <LogOut size={14} /> {busy ? t("workspace.leaving") : t("workspace.leave")}
            </Button>
          </Flex>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

async function readError(response: Response, fallback: string): Promise<string> {
  const value: unknown = await response.json().catch((): null => null);
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}
