"use client";

import type { AcceptInvitationResult, InvitationPreview } from "@task/api-client";
import { Badge, Button, Card, Flex, Heading, Text } from "@task/ui";
import { Mail } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import {
  authPageHref,
  clearInvitationToken,
  invitationPath,
  rememberInvitationToken,
} from "../lib/invite-auth";
import { isApiFailure } from "../lib/workspace-contracts";
import { isAcceptInvitationResult, isInvitationPreview } from "../lib/workspace-invitations";
import { useWorkspaceStore } from "../lib/workspace-store";
import { workspacePageHref } from "../lib/workspace-url";

export function InvitationAcceptance({ token }: Readonly<{ token: string }>): ReactNode {
  const { t } = useI18n();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const setSelectedWorkspaceId = useWorkspaceStore((state) => state.setSelectedWorkspaceId);
  const setSelectedProjectId = useWorkspaceStore((state) => state.setSelectedProjectId);

  useEffect(() => {
    const next = invitationPath(token);
    if (next === null || !rememberInvitationToken(window.sessionStorage, token)) {
      setError(t("invitations.invalidResponse"));
      return;
    }
    let active = true;
    void Promise.all([
      fetch(`/api/invitations/${encodeURIComponent(token)}`, { cache: "no-store" }),
      fetch("/api/auth/session", { cache: "no-store" }),
    ])
      .then(async ([previewResponse, sessionResponse]): Promise<void> => {
        const body: unknown = await previewResponse.json();
        if (!active) return;
        if (!previewResponse.ok || isApiFailure(body)) {
          clearInvitationToken(window.sessionStorage);
          setError(isApiFailure(body) ? body.error : t("invitations.previewError"));
          return;
        }
        if (!isInvitationPreview(body)) {
          clearInvitationToken(window.sessionStorage);
          setError(t("invitations.invalidResponse"));
          return;
        }
        setPreview(body);
        if (body.status !== "pending") {
          clearInvitationToken(window.sessionStorage);
          return;
        }
        if (sessionResponse.status === 401) {
          window.location.replace(authPageHref("register", { email: body.email, next }));
          return;
        }
        if (!sessionResponse.ok) setError(t("invitations.previewError"));
      })
      .catch(() => {
        if (active) setError(t("invitations.previewError"));
      });
    return () => {
      active = false;
    };
  }, [t, token]);

  const accept = async (): Promise<void> => {
    setSubmitting(true);
    const response = await fetch(`/api/invitations/${encodeURIComponent(token)}`, {
      method: "POST",
    });
    const body: unknown = await response.json();
    if (!response.ok || isApiFailure(body)) {
      setError(isApiFailure(body) ? body.error : t("invitations.acceptError"));
    } else if (isAcceptInvitationResult(body)) {
      selectAcceptedWorkspace(body, setSelectedWorkspaceId, setSelectedProjectId);
      clearInvitationToken(window.sessionStorage);
      setError(null);
      window.location.assign(workspacePageHref(body.workspace.slug, "agent"));
    }
    setSubmitting(false);
  };

  return (
    <Flex minHeight="100vh" align="center" justify="center" p="6">
      <Card size="4" style={{ maxWidth: 520, width: "100%" }}>
        <Flex direction="column" gap="4" align="start">
          <Mail size={28} />
          <Heading size="6">
            {t("invitations.acceptTitle", { workspace: preview?.workspaceName ?? "workspace" })}
          </Heading>
          {preview !== null && (
            <>
              <Text>{t("invitations.acceptFor", { email: preview.email })}</Text>
              <Badge>{preview.role}</Badge>
              {preview.status === "pending" ? (
                <Button disabled={submitting} onClick={() => void accept()}>
                  {submitting ? t("invitations.accepting") : t("invitations.accept")}
                </Button>
              ) : (
                <Text color="gray">
                  {t("invitations.inactive", {
                    status: t(`invitations.status.${preview.status}`),
                  })}
                </Text>
              )}
            </>
          )}
          {preview === null && error === null && <Text color="gray">{t("common.loading")}</Text>}
          {error !== null && <Text color="red">{error}</Text>}
        </Flex>
      </Card>
    </Flex>
  );
}

export function selectAcceptedWorkspace(
  acceptance: AcceptInvitationResult,
  setWorkspaceId: (workspaceId: string | null) => void,
  setProjectId: (projectId: string | null) => void,
): void {
  setWorkspaceId(acceptance.workspace.id);
  setProjectId(null);
}
