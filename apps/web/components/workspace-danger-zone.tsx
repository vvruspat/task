"use client";

import { AlertDialog, Button, Card, Flex, Text, TextField } from "@radix-ui/themes";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import { notifyWorkspaceDataChanged } from "../lib/use-workspace-data";
import { useWorkspaceStore } from "../lib/workspace-store";

type WorkspaceDangerZoneProps = {
  workspaceId: string;
  workspaceName: string;
};

export function WorkspaceDangerZone({
  workspaceId,
  workspaceName,
}: Readonly<WorkspaceDangerZoneProps>): ReactNode {
  const { t } = useI18n();
  const router = useRouter();
  const setSelectedProjectId = useWorkspaceStore((state) => state.setSelectedProjectId);
  const setSelectedWorkspaceId = useWorkspaceStore((state) => state.setSelectedWorkspaceId);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = confirmation.trim() === workspaceName;

  async function deleteWorkspace(): Promise<void> {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/workspace", {
      body: JSON.stringify({ workspaceId }),
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });
    if (!response.ok) {
      setError(await readError(response, t("workspace.deleteError")));
      setBusy(false);
      return;
    }

    setSelectedProjectId(null);
    setSelectedWorkspaceId(null);
    setOpen(false);
    router.replace("/agent");
    notifyWorkspaceDataChanged();
    router.refresh();
  }

  return (
    <Card className="panel project-danger-zone">
      <Flex align="center" justify="between" gap="4" wrap="wrap">
        <div>
          <Text as="div" size="3" weight="bold" color="red">
            {t("workspace.deleteTitle")}
          </Text>
          <Text as="div" size="2" color="gray">
            {t("workspace.deleteDescription")}
          </Text>
        </div>
        <Button color="red" variant="soft" onClick={() => setOpen(true)}>
          <Trash2 size={14} /> {t("workspace.deleteTitle")}
        </Button>
      </Flex>
      <AlertDialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setConfirmation("");
            setError(null);
            setBusy(false);
          }
        }}
      >
        <AlertDialog.Content maxWidth="480px">
          <AlertDialog.Title>
            {t("workspace.deleteConfirm", { name: workspaceName })}
          </AlertDialog.Title>
          <AlertDialog.Description size="2">
            {t("workspace.deleteInstruction")}
          </AlertDialog.Description>
          <Flex direction="column" gap="3" mt="4">
            <TextField.Root
              autoFocus
              aria-label={t("workspace.deleteInput")}
              placeholder={workspaceName}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            {error !== null && (
              <Text color="red" size="2">
                {error}
              </Text>
            )}
            <Flex justify="end" gap="3">
              <AlertDialog.Cancel>
                <Button color="gray" variant="soft" disabled={busy}>
                  {t("common.cancel")}
                </Button>
              </AlertDialog.Cancel>
              <Button
                color="red"
                disabled={!confirmed || busy}
                onClick={() => void deleteWorkspace()}
              >
                {busy ? t("workspace.deleting") : t("common.deleteForever")}
              </Button>
            </Flex>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Card>
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
