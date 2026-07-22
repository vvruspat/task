"use client";

import type { WorkspaceInvitation } from "@task/api-client";
import { Badge, Button, Flex, Select, Table, Text, TextField } from "@task/ui";
import { Mail, X } from "lucide-react";
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import { isApiFailure } from "../lib/workspace-contracts";
import { isWorkspaceInvitation, isWorkspaceInvitations } from "../lib/workspace-invitations";

type InvitationRole = "admin" | "guest" | "member";

export function WorkspaceInvitations({
  workspaceId,
}: Readonly<{ workspaceId: string }>): ReactNode {
  const { locale, t } = useI18n();
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("member");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const response = await fetch(
      `/api/workspace/invitations?workspaceId=${encodeURIComponent(workspaceId)}`,
      { cache: "no-store" },
    );
    const body: unknown = await response.json();
    if (!response.ok || isApiFailure(body)) {
      setError(isApiFailure(body) ? body.error : t("invitations.loadError"));
    } else if (isWorkspaceInvitations(body)) {
      setInvitations(body);
      setError(null);
    }
    setLoading(false);
  }, [t, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    const response = await fetch("/api/workspace/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role, workspaceId }),
    });
    const body: unknown = await response.json();
    if (!response.ok || isApiFailure(body)) {
      setError(isApiFailure(body) ? body.error : t("invitations.sendError"));
    } else if (isWorkspaceInvitation(body)) {
      setInvitations((current) => [body, ...current]);
      setEmail("");
      setError(null);
    }
    setSubmitting(false);
  };

  const revoke = async (invitationId: string): Promise<void> => {
    setRevokingId(invitationId);
    try {
      const response = await fetch(
        `/api/workspace/invitations/${encodeURIComponent(invitationId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
        { method: "DELETE" },
      );
      const body: unknown = await response.json();
      if (!response.ok || isApiFailure(body)) {
        setError(isApiFailure(body) ? body.error : t("invitations.revokeError"));
        return;
      }
      if (isWorkspaceInvitation(body)) {
        setInvitations((current) =>
          current.map((invitation) => (invitation.id === body.id ? body : invitation)),
        );
        setError(null);
      }
    } catch (_error: unknown) {
      setError(t("invitations.revokeError"));
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Flex direction="column" gap="3">
      <form onSubmit={(event) => void submit(event)}>
        <Flex gap="2" align="end" wrap="wrap">
          <Flex direction="column" gap="1" flexGrow="1" minWidth="360px" maxWidth="560px">
            <Text as="label" htmlFor="workspace-invitation-email" size="2">
              {t("common.email")}
            </Text>
            <TextField.Root
              id="workspace-invitation-email"
              required
              type="email"
              placeholder={t("invitations.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
          </Flex>
          <Flex direction="column" gap="1">
            <Text as="label" htmlFor="workspace-invitation-role" size="2">
              {t("invitations.role")}
            </Text>
            <Select.Root value={role} onValueChange={(value: InvitationRole) => setRole(value)}>
              <Select.Trigger id="workspace-invitation-role" />
              <Select.Content>
                <Select.Item value="admin">{t("workspace.role.admin")}</Select.Item>
                <Select.Item value="member">{t("workspace.role.member")}</Select.Item>
                <Select.Item value="guest">{t("workspace.role.guest")}</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>
          <Button type="submit" disabled={submitting || email.trim().length === 0}>
            <Mail size={14} />
            {submitting ? t("invitations.sending") : t("invitations.send")}
          </Button>
        </Flex>
      </form>
      {error !== null && <Text color="red">{error}</Text>}
      {loading ? (
        <Text color="gray">{t("invitations.loading")}</Text>
      ) : invitations.length === 0 ? (
        <Text color="gray">{t("invitations.empty")}</Text>
      ) : (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>{t("common.email")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("invitations.role")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("common.status")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("invitations.sentAt")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("invitations.expiresAt")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("invitations.actions")}</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {invitations.map((invitation) => (
              <Table.Row key={invitation.id}>
                <Table.RowHeaderCell>{invitation.email}</Table.RowHeaderCell>
                <Table.Cell>{t(`workspace.role.${invitation.role}`)}</Table.Cell>
                <Table.Cell>
                  <Badge color={statusColor(invitation.status)}>
                    {t(`invitations.status.${invitation.status}`)}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{formatInvitationDate(invitation.createdAt, locale)}</Table.Cell>
                <Table.Cell>{formatInvitationDate(invitation.expiresAt, locale)}</Table.Cell>
                <Table.Cell>
                  {invitation.status === "pending" ? (
                    <Button
                      type="button"
                      size="1"
                      variant="soft"
                      color="red"
                      disabled={revokingId !== null}
                      aria-label={t("invitations.revoke", { email: invitation.email })}
                      onClick={() => void revoke(invitation.id)}
                    >
                      <X size={14} />
                      {revokingId === invitation.id
                        ? t("invitations.revoking")
                        : t("invitations.revokeAction")}
                    </Button>
                  ) : (
                    <Text color="gray">—</Text>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Flex>
  );
}

function formatInvitationDate(value: string, locale: string): string {
  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusColor(status: WorkspaceInvitation["status"]): "gray" | "green" | "orange" {
  if (status === "pending") return "orange";
  if (status === "used") return "green";
  return "gray";
}
