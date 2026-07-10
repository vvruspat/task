import type {
  CreateWorkspaceStatusInput,
  TaskApiClient,
  TelegramIdentityLinkStatus,
  UpdateWorkspaceMemberRoleInput,
  UpdateWorkspaceStatusInput,
  WorkspaceDetail,
  WorkspaceMember,
} from "@task/api-client";
import {
  MAlert,
  MBox,
  MButton,
  MCheckbox,
  MFlex,
  MHeading,
  MInput,
  MOperationalContentGrid,
  MSelect,
  MText,
} from "@task/ui/app";
import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildSettingsSummary,
  buildSettingsWorkspaceRows,
  buildWorkspaceMemberRoleUpdateInput,
  buildWorkspaceStatusCreateInput,
  canManageWorkspaceSettings,
  getSettingsMutationSettlement,
  getTelegramMiniAppInitData,
  isTelegramIdentityUnlinkedError,
  shouldApplySettingsWorkspaceSettlement,
  shouldConfirmWorkspaceStatusDeletion,
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
  currentUserId: string | null;
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
  currentUserId,
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
  const [statusesState, setStatusesState] = useState<LoadState<WorkspaceStatus[]>>({
    status: "idle",
  });
  const [settingsActionError, setSettingsActionError] = useState<string | null>(null);
  const [activeActionWorkspaceId, setActiveActionWorkspaceId] = useState<string | null>(null);
  const [telegramState, setTelegramState] = useState<TelegramLinkState>({ status: "loading" });
  const selectedWorkspaceIdRef = useRef(selectedWorkspaceId);
  selectedWorkspaceIdRef.current = selectedWorkspaceId;

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
    setActiveActionWorkspaceId(null);
    setSettingsActionError(null);
    if (client === null || selectedWorkspaceId === null) {
      setWorkspaceState({ status: "idle" });
      setMembersState({ status: "idle" });
      setStatusesState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setWorkspaceState({ status: "loading" });
    setMembersState({ status: "loading" });
    setStatusesState({ status: "loading" });
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
    void client
      .listStatuses({ workspaceId: selectedWorkspaceId })
      .then((loadedStatuses) => {
        if (!cancelled) setStatusesState({ status: "loaded", value: loadedStatuses });
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatusesState({ message: toErrorMessage(error), status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [client, selectedWorkspaceId]);

  const currentMember =
    membersState.status === "loaded" && currentUserId !== null
      ? (membersState.value.find((member) => member.userId === currentUserId) ?? null)
      : null;
  const canManageSettings =
    currentMember !== null && canManageWorkspaceSettings(currentMember.role);
  const isSettingsActionPending = activeActionWorkspaceId !== null;

  const refreshMembers = useCallback(
    async (workspaceId: string): Promise<void> => {
      if (client === null) return;
      const members = await client.listWorkspaceMembers({ workspaceId });
      if (shouldApplySettingsWorkspaceSettlement(selectedWorkspaceIdRef.current, workspaceId)) {
        setMembersState({ status: "loaded", value: members });
      }
    },
    [client],
  );

  const refreshStatuses = useCallback(
    async (workspaceId: string): Promise<void> => {
      if (client === null) return;
      const loadedStatuses = await client.listStatuses({ workspaceId });
      if (shouldApplySettingsWorkspaceSettlement(selectedWorkspaceIdRef.current, workspaceId)) {
        setStatusesState({ status: "loaded", value: loadedStatuses });
      }
    },
    [client],
  );

  async function updateMemberRole(
    memberId: string,
    role: UpdateWorkspaceMemberRoleInput["role"],
  ): Promise<void> {
    if (client === null || selectedWorkspaceId === null) return;
    const workspaceId = selectedWorkspaceId;
    setSettingsActionError(null);
    setActiveActionWorkspaceId(workspaceId);
    try {
      await client.updateWorkspaceMemberRole({
        body: buildWorkspaceMemberRoleUpdateInput(role),
        memberId,
        workspaceId,
      });
      if (
        getSettingsMutationSettlement({
          capturedWorkspaceId: workspaceId,
          currentWorkspaceId: selectedWorkspaceIdRef.current,
          errorMessage: null,
        }).shouldRefresh
      ) {
        await refreshMembers(workspaceId);
      }
    } catch (error: unknown) {
      const settlement = getSettingsMutationSettlement({
        capturedWorkspaceId: workspaceId,
        currentWorkspaceId: selectedWorkspaceIdRef.current,
        errorMessage: toErrorMessage(error),
      });
      if (settlement.errorMessage !== null) setSettingsActionError(settlement.errorMessage);
    } finally {
      if (shouldApplySettingsWorkspaceSettlement(selectedWorkspaceIdRef.current, workspaceId)) {
        setActiveActionWorkspaceId(null);
      }
    }
  }

  async function createStatus(input: CreateWorkspaceStatusInput): Promise<void> {
    if (client === null || selectedWorkspaceId === null) return;
    const workspaceId = selectedWorkspaceId;
    setSettingsActionError(null);
    setActiveActionWorkspaceId(workspaceId);
    try {
      await client.createWorkspaceStatus({ body: input, workspaceId });
      if (
        getSettingsMutationSettlement({
          capturedWorkspaceId: workspaceId,
          currentWorkspaceId: selectedWorkspaceIdRef.current,
          errorMessage: null,
        }).shouldRefresh
      ) {
        await refreshStatuses(workspaceId);
      }
    } catch (error: unknown) {
      const settlement = getSettingsMutationSettlement({
        capturedWorkspaceId: workspaceId,
        currentWorkspaceId: selectedWorkspaceIdRef.current,
        errorMessage: toErrorMessage(error),
      });
      if (settlement.errorMessage !== null) setSettingsActionError(settlement.errorMessage);
    } finally {
      if (shouldApplySettingsWorkspaceSettlement(selectedWorkspaceIdRef.current, workspaceId)) {
        setActiveActionWorkspaceId(null);
      }
    }
  }

  async function updateStatus(statusId: string, input: UpdateWorkspaceStatusInput): Promise<void> {
    if (client === null || selectedWorkspaceId === null) return;
    const workspaceId = selectedWorkspaceId;
    setSettingsActionError(null);
    setActiveActionWorkspaceId(workspaceId);
    try {
      await client.updateWorkspaceStatus({
        body: input,
        statusId,
        workspaceId,
      });
      if (
        getSettingsMutationSettlement({
          capturedWorkspaceId: workspaceId,
          currentWorkspaceId: selectedWorkspaceIdRef.current,
          errorMessage: null,
        }).shouldRefresh
      ) {
        await refreshStatuses(workspaceId);
      }
    } catch (error: unknown) {
      const settlement = getSettingsMutationSettlement({
        capturedWorkspaceId: workspaceId,
        currentWorkspaceId: selectedWorkspaceIdRef.current,
        errorMessage: toErrorMessage(error),
      });
      if (settlement.errorMessage !== null) setSettingsActionError(settlement.errorMessage);
    } finally {
      if (shouldApplySettingsWorkspaceSettlement(selectedWorkspaceIdRef.current, workspaceId)) {
        setActiveActionWorkspaceId(null);
      }
    }
  }

  async function deleteStatus(status: WorkspaceStatus): Promise<void> {
    if (client === null || selectedWorkspaceId === null) return;
    if (
      !shouldConfirmWorkspaceStatusDeletion(
        window.confirm(`Delete status “${status.name}”? This cannot be undone.`),
      )
    )
      return;
    const workspaceId = selectedWorkspaceId;
    setSettingsActionError(null);
    setActiveActionWorkspaceId(workspaceId);
    try {
      await client.deleteWorkspaceStatus({ statusId: status.id, workspaceId });
      if (
        getSettingsMutationSettlement({
          capturedWorkspaceId: workspaceId,
          currentWorkspaceId: selectedWorkspaceIdRef.current,
          errorMessage: null,
        }).shouldRefresh
      ) {
        await refreshStatuses(workspaceId);
      }
    } catch (error: unknown) {
      const settlement = getSettingsMutationSettlement({
        capturedWorkspaceId: workspaceId,
        currentWorkspaceId: selectedWorkspaceIdRef.current,
        errorMessage: toErrorMessage(error),
      });
      if (settlement.errorMessage !== null) setSettingsActionError(settlement.errorMessage);
    } finally {
      if (shouldApplySettingsWorkspaceSettlement(selectedWorkspaceIdRef.current, workspaceId)) {
        setActiveActionWorkspaceId(null);
      }
    }
  }

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
          {settingsActionError === null ? null : (
            <MAlert mode="error">{settingsActionError}</MAlert>
          )}
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
            ? membersState.value.map((member) => (
                <MemberRow
                  canManage={canManageSettings}
                  disabled={isSettingsActionPending}
                  key={member.id}
                  member={member}
                  onRoleChange={(role) => void updateMemberRole(member.id, role)}
                />
              ))
            : null}
        </MFlex>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Workflow" title="Statuses" titleId="settings-statuses-title">
        <MFlex align="stretch" direction="column" gap="m">
          {statusesState.status === "loading" ? (
            <MText as="p" mode="secondary">
              Loading statuses.
            </MText>
          ) : null}
          {statusesState.status === "error" ? (
            <MAlert mode="error">{statusesState.message}</MAlert>
          ) : null}
          {statusesState.status === "loaded" && statusesState.value.length === 0 ? (
            <MText as="p" mode="secondary">
              No statuses found.
            </MText>
          ) : null}
          {statusesState.status === "loaded"
            ? statusesState.value.map((status) => (
                <StatusRow
                  canManage={canManageSettings}
                  disabled={isSettingsActionPending}
                  key={status.id}
                  onDelete={() => void deleteStatus(status)}
                  onUpdate={(input) => void updateStatus(status.id, input)}
                  status={status}
                />
              ))
            : null}
          {canManageSettings ? (
            <CreateStatusForm
              disabled={isSettingsActionPending}
              onCreate={(input) => void createStatus(input)}
            />
          ) : null}
          {membersState.status === "loaded" && !canManageSettings ? (
            <MText as="p" mode="secondary">
              Only workspace owners and admins can manage statuses.
            </MText>
          ) : null}
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

type EditableMemberRole = UpdateWorkspaceMemberRoleInput["role"];

function MemberRow({
  canManage,
  disabled,
  member,
  onRoleChange,
}: {
  canManage: boolean;
  disabled: boolean;
  member: WorkspaceMember;
  onRoleChange(role: EditableMemberRole): void;
}): ReactElement {
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
      {canManage && member.role !== "owner" ? (
        <MSelect
          aria-label={`Role for ${member.displayName}`}
          disabled={disabled}
          options={memberRoleOptions}
          onValueChange={(value) => {
            if (isEditableMemberRole(value)) onRoleChange(value);
          }}
          value={member.role}
        />
      ) : (
        <MText as="p" mode="secondary">
          {member.role}
        </MText>
      )}
    </MFlex>
  );
}

function StatusRow({
  canManage,
  disabled,
  onDelete,
  onUpdate,
  status,
}: {
  canManage: boolean;
  disabled: boolean;
  onDelete(): void;
  onUpdate(input: UpdateWorkspaceStatusInput): void;
  status: WorkspaceStatus;
}): ReactElement {
  const [name, setName] = useState(status.name);
  const [color, setColor] = useState(status.color);
  const [isDone, setIsDone] = useState(status.isDone);
  useEffect(() => {
    setName(status.name);
    setColor(status.color);
    setIsDone(status.isDone);
  }, [status]);
  if (!canManage)
    return (
      <MText as="p">
        {status.name} · {status.isDone ? "Done" : "Open"}
      </MText>
    );
  return (
    <MFlex as="article" align="start" direction="column" gap="s">
      <MInput
        aria-label={`Status name for ${status.name}`}
        disabled={disabled}
        onChange={(event) => setName(event.target.value)}
        value={name}
      />
      <MInput
        aria-label={`Status color for ${status.name}`}
        disabled={disabled}
        onChange={(event) => setColor(event.target.value)}
        value={color}
      />
      <MCheckbox
        checked={isDone}
        disabled={disabled}
        label="Completed status"
        onCheckedChange={setIsDone}
      />
      <MFlex gap="s">
        <MButton disabled={disabled} onClick={() => onUpdate({ color, isDone, name })}>
          Save status
        </MButton>
        <MButton disabled={disabled} mode="outlined" onClick={onDelete}>
          Delete status
        </MButton>
      </MFlex>
    </MFlex>
  );
}

function CreateStatusForm({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate(input: CreateWorkspaceStatusInput): void;
}): ReactElement {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [isDone, setIsDone] = useState(false);
  return (
    <MFlex
      as="form"
      align="start"
      direction="column"
      gap="s"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmedName = name.trim();
        if (trimmedName.length > 0) {
          onCreate(
            buildWorkspaceStatusCreateInput({ color, isDone, name: trimmedName, position: "1000" }),
          );
          setName("");
        }
      }}
    >
      <MHeading mode="h4">Add status</MHeading>
      <MInput
        aria-label="New status name"
        disabled={disabled}
        onChange={(event) => setName(event.target.value)}
        value={name}
      />
      <MInput
        aria-label="New status color"
        disabled={disabled}
        onChange={(event) => setColor(event.target.value)}
        value={color}
      />
      <MCheckbox
        checked={isDone}
        disabled={disabled}
        label="Completed status"
        onCheckedChange={setIsDone}
      />
      <MButton disabled={disabled} type="submit">
        Create status
      </MButton>
    </MFlex>
  );
}

const memberRoleOptions = [
  { key: "admin", value: "Admin" },
  { key: "member", value: "Member" },
  { key: "guest", value: "Guest" },
];

function isEditableMemberRole(value: string): value is EditableMemberRole {
  return value === "admin" || value === "member" || value === "guest";
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
