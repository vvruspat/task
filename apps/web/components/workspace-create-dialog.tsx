"use client";

import type { WorkspaceSummary } from "@task/api-client";
import { Button, Dialog, Flex, Text, TextField } from "@task/ui";
import { type FormEvent, type ReactNode, useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import { readCreatedWorkspace, readWorkspaceCreateError } from "../lib/workspace-create";

export function WorkspaceCreateDialog({
  onCreated,
  onOpenChange,
  open,
}: Readonly<{
  onCreated: (workspace: Pick<WorkspaceSummary, "id" | "slug">) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}>): ReactNode {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (normalizedName.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/workspace", {
        body: JSON.stringify({ name: normalizedName }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body: unknown = await response.json().catch((): null => null);
      if (!response.ok) {
        setError(readWorkspaceCreateError(body, t("workspace.createError")));
        return;
      }
      const workspace = readCreatedWorkspace(body);
      if (workspace === null) {
        setError(t("workspace.createError"));
        return;
      }
      setName("");
      onOpenChange(false);
      onCreated(workspace);
    } catch {
      setError(t("auth.unreachable"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>{t("workspace.createNew")}</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          {t("workspace.createHint")}
        </Dialog.Description>
        <form onSubmit={(event) => void submit(event)}>
          <Flex direction="column" gap="3" mt="4">
            <label htmlFor="new-workspace-name">
              <Text as="div" mb="1" size="2" weight="medium">
                {t("common.name")}
              </Text>
              <TextField.Root
                autoFocus
                id="new-workspace-name"
                maxLength={80}
                placeholder={t("workspace.onboardingPlaceholder")}
                required
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </label>
            {error !== null && (
              <Text color="red" size="2" role="alert">
                {error}
              </Text>
            )}
            <Flex justify="end" gap="2">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  {t("common.cancel")}
                </Button>
              </Dialog.Close>
              <Button disabled={submitting || name.trim().length === 0} type="submit">
                {submitting ? t("workspace.creating") : t("common.create")}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
