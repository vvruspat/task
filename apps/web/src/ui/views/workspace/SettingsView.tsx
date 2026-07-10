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
  Alert,
  Button,
  Card,
  Checkbox,
  ContentGrid,
  DescriptionList,
  Flex,
  Heading,
  Input,
  Select,
  Stack,
  Text,
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
    <ContentGrid>
      <SettingsPanel eyebrow="Settings" title="Workspace context" titleId="settings-view-title">
        <Stack gap="lg">
          {workspaceState.status === "loading" ? (
            <Text tone="muted">Loading workspace details.</Text>
          ) : null}
          {workspaceState.status === "error" ? (
            <Alert tone="danger">{workspaceState.message}</Alert>
          ) : null}
          {workspaceState.status === "loaded" ? (
            <Stack gap="xs">
              <Heading level={4}>{workspaceState.value.name}</Heading>
              <Text tone="muted">{workspaceState.value.slug}</Text>
              <Text tone="muted">Created {formatDate(workspaceState.value.createdAt)}</Text>
            </Stack>
          ) : null}
          {rows.map((workspace) => (
            <Flex align="start" gap="md" key={workspace.id} justify="between">
              <Stack gap="xs">
                <Heading level={4}>{workspace.name}</Heading>
                <Text tone="muted">{workspace.slug}</Text>
              </Stack>
              <time dateTime={workspace.updatedAtLabel}>{workspace.updatedAtLabel}</time>
            </Flex>
          ))}
        </Stack>
      </SettingsPanel>

      <SettingsPanel eyebrow="People" title="Members" titleId="settings-members-title">
        <Stack gap="lg">
          {settingsActionError === null ? null : <Alert tone="danger">{settingsActionError}</Alert>}
          {membersState.status === "idle" ? (
            <Text tone="muted">Select a workspace to view its members.</Text>
          ) : null}
          {membersState.status === "loading" ? <Text tone="muted">Loading members.</Text> : null}
          {membersState.status === "error" ? (
            <Alert tone="danger">{membersState.message}</Alert>
          ) : null}
          {membersState.status === "loaded" && membersState.value.length === 0 ? (
            <Text tone="muted">No members found.</Text>
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
        </Stack>
      </SettingsPanel>

      <SettingsPanel eyebrow="Workflow" title="Statuses" titleId="settings-statuses-title">
        <Stack gap="lg">
          {statusesState.status === "loading" ? <Text tone="muted">Loading statuses.</Text> : null}
          {statusesState.status === "error" ? (
            <Alert tone="danger">{statusesState.message}</Alert>
          ) : null}
          {statusesState.status === "loaded" && statusesState.value.length === 0 ? (
            <Text tone="muted">No statuses found.</Text>
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
            <Text tone="muted">Only workspace owners and admins can manage statuses.</Text>
          ) : null}
        </Stack>
      </SettingsPanel>

      <SettingsPanel eyebrow="Telegram" title="Mini App identity" titleId="settings-telegram-title">
        <Stack gap="lg">
          <TelegramLinkContent
            initDataAvailable={initDataAvailable}
            onLink={() => void linkTelegramIdentity()}
            state={telegramState}
          />
        </Stack>
      </SettingsPanel>

      <SettingsPanel eyebrow="Summary" title="Loaded context" titleId="settings-summary-title">
        <Text tone="muted">{summary.selectedWorkspaceLabel}</Text>
        <Text tone="muted">{summary.selectedProjectLabel}</Text>
        <DescriptionList
          items={[
            { label: "Workspaces", value: summary.workspaceCount },
            { label: "Projects", value: summary.projectCount },
            { label: "Tasks", value: summary.taskCount },
            { label: "Statuses", value: summary.statusCount },
            { label: "Skills", value: summary.skillCount },
          ]}
        />
      </SettingsPanel>
    </ContentGrid>
  );
}

type EditableMemberRole = UpdateWorkspaceMemberRoleInput["role"];

function SettingsPanel({
  children,
  eyebrow,
  title,
  titleId,
}: {
  children: ReactElement | ReactElement[];
  eyebrow: string;
  title: string;
  titleId: string;
}): ReactElement {
  return (
    <Card aria-labelledby={titleId}>
      <Stack gap="lg">
        <Stack gap="xs">
          <Text tone="muted">{eyebrow}</Text>
          <Heading id={titleId} level={3}>
            {title}
          </Heading>
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}

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
    <Flex align="start" gap="md" justify="between">
      <Stack gap="xs">
        <Heading level={4}>{member.displayName}</Heading>
        {member.email === null ? null : <Text tone="muted">{member.email}</Text>}
      </Stack>
      {canManage && member.role !== "owner" ? (
        <Select
          aria-label={`Role for ${member.displayName}`}
          disabled={disabled}
          options={memberRoleOptions}
          onValueChange={(value) => {
            if (isEditableMemberRole(value)) onRoleChange(value);
          }}
          value={member.role}
        />
      ) : (
        <Text tone="muted">{member.role}</Text>
      )}
    </Flex>
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
      <Text>
        {status.name} · {status.isDone ? "Done" : "Open"}
      </Text>
    );
  return (
    <Stack gap="sm">
      <Input
        aria-label={`Status name for ${status.name}`}
        disabled={disabled}
        onChange={(event) => setName(event.target.value)}
        value={name}
      />
      <Input
        aria-label={`Status color for ${status.name}`}
        disabled={disabled}
        onChange={(event) => setColor(event.target.value)}
        value={color}
      />
      <Checkbox
        checked={isDone}
        disabled={disabled}
        label="Completed status"
        onCheckedChange={(checked) => setIsDone(checked === true)}
      />
      <Flex gap="sm">
        <Button disabled={disabled} onClick={() => onUpdate({ color, isDone, name })}>
          Save status
        </Button>
        <Button disabled={disabled} onClick={onDelete} variant="danger">
          Delete status
        </Button>
      </Flex>
    </Stack>
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
    <form
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
      <Stack gap="sm">
        <Heading level={4}>Add status</Heading>
        <Input
          aria-label="New status name"
          disabled={disabled}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        <Input
          aria-label="New status color"
          disabled={disabled}
          onChange={(event) => setColor(event.target.value)}
          value={color}
        />
        <Checkbox
          checked={isDone}
          disabled={disabled}
          label="Completed status"
          onCheckedChange={(checked) => setIsDone(checked === true)}
        />
        <Button disabled={disabled} type="submit">
          Create status
        </Button>
      </Stack>
    </form>
  );
}

const memberRoleOptions = [
  { label: "Admin", value: "admin" },
  { label: "Member", value: "member" },
  { label: "Guest", value: "guest" },
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
  if (state.status === "loading") return <Text tone="muted">Checking link status.</Text>;
  if (state.status === "unavailable")
    return <Alert tone="danger">Connect the workspace API to view Telegram identity status.</Alert>;
  if (state.status === "error") return <Alert tone="danger">{state.message}</Alert>;
  if (state.status === "linked") {
    return (
      <>
        <Text>Telegram account {state.value.telegramId} is linked.</Text>
        <Text tone="muted">
          Linked {formatDate(state.value.linkedAt)}
          {state.value.lastSeenAt === null || state.value.lastSeenAt === undefined
            ? ""
            : ` · Last seen ${formatDate(state.value.lastSeenAt)}`}
        </Text>
      </>
    );
  }
  const showLinkAction = shouldShowTelegramLinkAction({
    initData: initDataAvailable ? "available" : null,
    linkState: "unlinked",
  });
  if (state.status === "unlinked" && !showLinkAction) {
    return (
      <Text tone="muted">
        Open this page from the Telegram Mini App to link your account. The browser cannot create or
        safely accept a Telegram identity on its own.
      </Text>
    );
  }
  return (
    <>
      <Text tone="muted">Your verified Telegram Mini App session is ready to link.</Text>
      <Button disabled={state.status === "linking"} onClick={onLink}>
        {state.status === "linking" ? "Linking…" : "Link Telegram account"}
      </Button>
    </>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The requested settings could not be loaded.";
}
function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}
