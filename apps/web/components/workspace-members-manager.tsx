"use client";

import {
  AlertDialog,
  Avatar,
  Badge,
  Button,
  Flex,
  IconButton,
  Select,
  Table,
  Text,
} from "@task/ui";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import { updateWorkspaceData } from "../lib/use-workspace-data";
import { canManageWorkspaceMember, type WorkspaceBootstrap } from "../lib/workspace-contracts";

type WorkspaceMember = WorkspaceBootstrap["workspace"]["members"][number];
type AssignableRole = Exclude<WorkspaceMember["role"], "owner">;

export function WorkspaceMembersManager({
  currentMember,
  members,
  workspaceId,
}: Readonly<{
  currentMember: WorkspaceMember;
  members: WorkspaceMember[];
  workspaceId: string;
}>): ReactNode {
  const { t } = useI18n();
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateRole(member: WorkspaceMember, role: AssignableRole): Promise<void> {
    if (!canManageWorkspaceMember(currentMember, member) || busyMemberId !== null) return;
    setBusyMemberId(member.id);
    setError(null);
    const response = await fetch(`/api/workspace/members/${encodeURIComponent(member.id)}`, {
      body: JSON.stringify({ role, workspaceId }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });
    if (!response.ok) {
      setError(await readError(response, t("workspace.memberRoleError")));
      setBusyMemberId(null);
      return;
    }
    updateWorkspaceData((current) => ({
      ...current,
      workspace: {
        ...current.workspace,
        members: current.workspace.members.map((item) =>
          item.id === member.id ? { ...item, role } : item,
        ),
      },
    }));
    setBusyMemberId(null);
  }

  async function removeMember(member: WorkspaceMember): Promise<void> {
    if (!canManageWorkspaceMember(currentMember, member) || busyMemberId !== null) return;
    setBusyMemberId(member.id);
    setError(null);
    const response = await fetch(
      `/api/workspace/members/${encodeURIComponent(member.id)}?workspaceId=${encodeURIComponent(workspaceId)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      setError(await readError(response, t("workspace.memberRemoveError")));
      setBusyMemberId(null);
      return;
    }
    updateWorkspaceData((current) => ({
      ...current,
      workspace: {
        ...current.workspace,
        members: current.workspace.members.filter((item) => item.id !== member.id),
      },
    }));
    setBusyMemberId(null);
  }

  return (
    <Flex direction="column" gap="3">
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>{t("common.name")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t("common.email")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t("invitations.role")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {members.map((member) => {
            const manageable = canManageWorkspaceMember(currentMember, member);
            return (
              <Table.Row key={member.id}>
                <Table.RowHeaderCell>
                  <Flex align="center" gap="2">
                    <Avatar
                      fallback={member.displayName.slice(0, 1)}
                      src={member.avatarUrl ?? undefined}
                      size="1"
                      color="indigo"
                    />
                    <Text size="2" weight="medium">
                      {member.displayName}
                    </Text>
                  </Flex>
                </Table.RowHeaderCell>
                <Table.Cell>
                  <Text size="2" color="gray">
                    {member.email ?? "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  {manageable && member.role !== "owner" ? (
                    <Select.Root
                      value={member.role}
                      disabled={busyMemberId !== null}
                      onValueChange={(value) => {
                        if (isAssignableRole(value)) void updateRole(member, value);
                      }}
                    >
                      <Select.Trigger
                        aria-label={t("workspace.memberRoleLabel", { name: member.displayName })}
                        variant="surface"
                      />
                      <Select.Content>
                        <Select.Item value="admin">{t("workspace.role.admin")}</Select.Item>
                        <Select.Item value="member">{t("workspace.role.member")}</Select.Item>
                        <Select.Item value="guest">{t("workspace.role.guest")}</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  ) : (
                    <Badge color={member.role === "owner" ? "indigo" : "gray"} variant="soft">
                      {t(`workspace.role.${member.role}`)}
                    </Badge>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {manageable && (
                    <AlertDialog.Root>
                      <AlertDialog.Trigger>
                        <IconButton
                          aria-label={t("workspace.removeMember", { name: member.displayName })}
                          color="red"
                          disabled={busyMemberId !== null}
                          size="1"
                          variant="ghost"
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </AlertDialog.Trigger>
                      <AlertDialog.Content maxWidth="440px">
                        <AlertDialog.Title>{t("workspace.removeMemberTitle")}</AlertDialog.Title>
                        <AlertDialog.Description size="2">
                          {t("workspace.removeMemberConfirm", { name: member.displayName })}
                        </AlertDialog.Description>
                        <Flex justify="end" gap="3" mt="4">
                          <AlertDialog.Cancel>
                            <Button color="gray" variant="soft">
                              {t("common.cancel")}
                            </Button>
                          </AlertDialog.Cancel>
                          <AlertDialog.Action>
                            <Button color="red" onClick={() => void removeMember(member)}>
                              {t("common.delete")}
                            </Button>
                          </AlertDialog.Action>
                        </Flex>
                      </AlertDialog.Content>
                    </AlertDialog.Root>
                  )}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
      {error !== null && (
        <Text color="red" size="2">
          {error}
        </Text>
      )}
    </Flex>
  );
}

function isAssignableRole(value: string): value is AssignableRole {
  return value === "admin" || value === "member" || value === "guest";
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
