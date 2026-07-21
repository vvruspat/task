"use client";

import { Box, Button, Flex, Text, TextField } from "@task/ui";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import { updateWorkspaceData } from "../lib/use-workspace-data";

export function WorkspaceNameEditor({
  name,
  workspaceId,
}: {
  name: string;
  workspaceId: string;
}): ReactNode {
  const { t } = useI18n();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setValue(name);
  }, [name]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextName = value.trim();
    if (nextName.length === 0 || nextName === name) return;
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/workspace", {
        body: JSON.stringify({ name: nextName, workspaceId }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const body: unknown = await response.json().catch((): null => null);
      if (!response.ok) {
        setError(readError(body, t("workspace.renameError")));
        return;
      }
      updateWorkspaceData((current) => ({
        ...current,
        availableWorkspaces: current.availableWorkspaces.map((workspace) =>
          workspace.id === workspaceId ? { ...workspace, name: nextName } : workspace,
        ),
        workspace: { ...current.workspace, name: nextName },
      }));
      setSaved(true);
    } catch {
      setError(t("auth.unreachable"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="workspace-settings-name">
        <Text as="div" size="2" weight="medium">
          {t("common.name")}
        </Text>
      </label>
      <Flex align="center" gap="2">
        <Box flexGrow="1">
          <TextField.Root
            id="workspace-settings-name"
            maxLength={80}
            required
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setSaved(false);
            }}
          />
        </Box>
        <Button
          disabled={saving || value.trim().length === 0 || value.trim() === name}
          type="submit"
        >
          {saving
            ? t("common.saving")
            : saved && value.trim() === name
              ? t("common.saved")
              : t("common.save")}
        </Button>
      </Flex>
      {error !== null && (
        <Text as="p" color="red" mt="2" size="2" role="alert">
          {error}
        </Text>
      )}
    </form>
  );
}

function readError(value: unknown, fallback: string): string {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}
