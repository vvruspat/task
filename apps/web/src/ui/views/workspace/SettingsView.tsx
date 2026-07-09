import type {
  TaskApiClient,
  TelegramIdentityLinkStatus,
  WorkspaceDetail,
  WorkspaceMember,
} from "@task/api-client";
import {
  MAlert,
  MBox,
  MButton,
  MFlex,
  MHeading,
  MOperationalContentGrid,
  MText,
} from "@task/ui/app";
import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  buildSettingsSummary,
  buildSettingsWorkspaceRows,
  getTelegramMiniAppInitData,
  isTelegramIdentityUnlinkedError,
  shouldShowTelegramLinkAction,
} from "../workspaceViewModels.js";
import type {
  ProjectSummary,
  TaskSkillSummary,
  TaskSummary,
  WorkspaceStatus,
  WorkspaceSummary,
} from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

type LoadState<TValue> =
  | { status: "idle" | "loading" }
  | { status: "loaded"; value: TValue }
  | { message: string; status: "error" };

type TelegramLinkState =
  | { status: "unavailable" }
  | { status: "unlinked" }
  | { status: "linked"; value: TelegramIdentityLinkStatus }
  | { status: "loading" | "linking" }
  | { message: string; status: "error" };

export type SettingsViewProps = {
  client: TaskApiClient | null;
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  skills: TaskSkillSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
};

export function SettingsView({
  client,
  projects,
  selectedProjectId,
  selectedWorkspaceId,
  skills,
  statuses,
  tasks,
  workspaces,
}: SettingsViewProps): ReactElement {
  const rows = buildSettingsWorkspaceRows(workspaces);
  const summary = buildSettingsSummary({
    projects,
    selectedProjectId,
    selectedWorkspaceId,
    skills,
    statuses,
    tasks,
    workspaces,
  });
  const [workspaceState, setWorkspaceState] = useState<LoadState<WorkspaceDetail>>({
    status: "idle",
  });
  const [membersState, setMembersState] = useState<LoadState<WorkspaceMember[]>>({
    status: "idle",
  });
  const [telegramState, setTelegramState] = useState<TelegramLinkState>({ status: "loading" });

  const loadTelegramStatus = useCallback(async (): Promise<void> => {
    if (client === null) {
      setTelegramState({ status: "unavailable" });
      return;
    }

    setTelegramState({ status: "loading" });
    try {
      const status = await client.getTelegramIdentityLinkStatus();
      setTelegramState({ status: "linked", value: status });
    } catch (error: unknown) {
      if (isTelegramIdentityUnlinkedError(error)) {
        setTelegramState({ status: "unlinked" });
        return;
      }
      setTelegramState({ message: toErrorMessage(error), status: "error" });
    }
  }, [client]);

  useEffect(() => {
    void loadTelegramStatus();
  }, [loadTelegramStatus]);

  useEffect(() => {
    if (client === null || selectedWorkspaceId === null) {
      setWorkspaceState({ status: "idle" });
      setMembersState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setWorkspaceState({ status: "loading" });
    setMembersState({ status: "loading" });
    void client
      .getWorkspace({ workspaceId: selectedWorkspaceId })
      .then((workspace) => {
        if (!cancelled) setWorkspaceState({ status: "loaded", value: workspace });
      })
      .catch((error: unknown) => {
        if (!cancelled) setWorkspaceState({ message: toErrorMessage(error), status: "error" });
      });
    void client
      .listWorkspaceMembers({ workspaceId: selectedWorkspaceId })
      .then((members) => {
        if (!cancelled) setMembersState({ status: "loaded", value: members });
      })
      .catch((error: unknown) => {
        if (!cancelled) setMembersState({ message: toErrorMessage(error), status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [client, selectedWorkspaceId]);

  async function linkTelegramIdentity(): Promise<void> {
    if (client === null) {
      setTelegramState({ status: "unavailable" });
      return;
    }
    const initData = getTelegramMiniAppInitData();
    if (initData === null) {
      setTelegramState({ status: "unlinked" });
      return;
    }

    setTelegramState({ status: "linking" });
    try {
      await client.linkTelegramMiniAppIdentity({ body: { initData } });
      await loadTelegramStatus();
    } catch (error: unknown) {
      setTelegramState({ message: toErrorMessage(error), status: "error" });
    }
  }

  const initDataAvailable = getTelegramMiniAppInitData() !== null;

  return (
    <MOperationalContentGrid>
      <WorkspacePanel eyebrow="Settings" title="Workspace context" titleId="settings-view-title">
        <MFlex align="stretch" direction="column" gap="m">
          {workspaceState.status === "loading" ? (
            <MText as="p" mode="secondary">
              Loading workspace details.
            </MText>
          ) : null}
          {workspaceState.status === "error" ? (
            <MAlert mode="error">{workspaceState.message}</MAlert>
          ) : null}
          {workspaceState.status === "loaded" ? (
            <MBox>
              <MHeading mode="h4">{workspaceState.value.name}</MHeading>
              <MText as="p" mode="secondary">
                {workspaceState.value.slug}
              </MText>
              <MText as="p" mode="secondary">
                Created {formatDate(workspaceState.value.createdAt)}
              </MText>
            </MBox>
          ) : null}
          {rows.map((workspace) => (
            <MFlex
              as="article"
              align="start"
              gap="m"
              key={workspace.id}
              justify="space-between"
              wrap="nowrap"
            >
              <MBox>
                <MHeading mode="h4">{workspace.name}</MHeading>
                <MText as="p" mode="secondary">
                  {workspace.slug}
                </MText>
              </MBox>
              <time dateTime={workspace.updatedAtLabel}>{workspace.updatedAtLabel}</time>
            </MFlex>
          ))}
        </MFlex>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="People" title="Members" titleId="settings-members-title">
        <MFlex align="stretch" direction="column" gap="m">
          {membersState.status === "idle" ? (
            <MText as="p" mode="secondary">
              Select a workspace to view its members.
            </MText>
          ) : null}
          {membersState.status === "loading" ? (
            <MText as="p" mode="secondary">
              Loading members.
            </MText>
          ) : null}
          {membersState.status === "error" ? (
            <MAlert mode="error">{membersState.message}</MAlert>
          ) : null}
          {membersState.status === "loaded" && membersState.value.length === 0 ? (
            <MText as="p" mode="secondary">
              No members found.
            </MText>
          ) : null}
          {membersState.status === "loaded"
            ? membersState.value.map((member) => <MemberRow key={member.id} member={member} />)
            : null}
        </MFlex>
      </WorkspacePanel>

      <WorkspacePanel
        eyebrow="Telegram"
        title="Mini App identity"
        titleId="settings-telegram-title"
      >
        <MFlex align="stretch" direction="column" gap="m">
          <TelegramLinkContent
            initDataAvailable={initDataAvailable}
            onLink={() => void linkTelegramIdentity()}
            state={telegramState}
          />
        </MFlex>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Loaded context" titleId="settings-summary-title">
        <MText as="p" mode="secondary">
          {summary.selectedWorkspaceLabel}
        </MText>
        <MText as="p" mode="secondary">
          {summary.selectedProjectLabel}
        </MText>
        <WorkspaceMetrics
          items={[
            { label: "Workspaces", value: summary.workspaceCount },
            { label: "Projects", value: summary.projectCount },
            { label: "Tasks", value: summary.taskCount },
            { label: "Statuses", value: summary.statusCount },
            { label: "Skills", value: summary.skillCount },
          ]}
        />
      </WorkspacePanel>
    </MOperationalContentGrid>
  );
}

function MemberRow({ member }: { member: WorkspaceMember }): ReactElement {
  return (
    <MFlex as="article" align="start" gap="m" justify="space-between" wrap="nowrap">
      <MBox>
        <MHeading mode="h4">{member.displayName}</MHeading>
        {member.email === null ? null : (
          <MText as="p" mode="secondary">
            {member.email}
          </MText>
        )}
      </MBox>
      <MText as="p" mode="secondary">
        {member.role}
      </MText>
    </MFlex>
  );
}

function TelegramLinkContent({
  initDataAvailable,
  onLink,
  state,
}: {
  initDataAvailable: boolean;
  onLink(): void;
  state: TelegramLinkState;
}): ReactElement {
  if (state.status === "loading")
    return (
      <MText as="p" mode="secondary">
        Checking link status.
      </MText>
    );
  if (state.status === "unavailable")
    return (
      <MAlert mode="error">Connect the workspace API to view Telegram identity status.</MAlert>
    );
  if (state.status === "error") return <MAlert mode="error">{state.message}</MAlert>;
  if (state.status === "linked") {
    return (
      <>
        <MText as="p">Telegram account {state.value.telegramId} is linked.</MText>
        <MText as="p" mode="secondary">
          Linked {formatDate(state.value.linkedAt)}
          {state.value.lastSeenAt === null || state.value.lastSeenAt === undefined
            ? ""
            : ` · Last seen ${formatDate(state.value.lastSeenAt)}`}
        </MText>
      </>
    );
  }
  const showLinkAction = shouldShowTelegramLinkAction({
    initData: initDataAvailable ? "available" : null,
    linkState: "unlinked",
  });
  if (state.status === "unlinked" && !showLinkAction) {
    return (
      <MText as="p" mode="secondary">
        Open this page from the Telegram Mini App to link your account. The browser cannot create or
        safely accept a Telegram identity on its own.
      </MText>
    );
  }
  return (
    <>
      <MText as="p" mode="secondary">
        Your verified Telegram Mini App session is ready to link.
      </MText>
      <MButton disabled={state.status === "linking"} onClick={onLink}>
        {state.status === "linking" ? "Linking…" : "Link Telegram account"}
      </MButton>
    </>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The requested settings could not be loaded.";
}
function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}
