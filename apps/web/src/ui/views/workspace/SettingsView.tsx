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
  Button,
  Callout,
  Card,
  Checkbox,
  DataList,
  Flex,
  Grid,
  Heading,
  Select,
  Text,
  TextField,
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
    <Grid columns={{ initial: "1", md: "2" }} gap="4">
      <SettingsPanel eyebrow="Settings" title="Workspace context" titleId="settings-view-title">
        <Flex direction="column" gap="4">
          {workspaceState.status === "loading" ? (
            <Text as="p" color="gray">
              Loading workspace details.
            </Text>
          ) : null}
          {workspaceState.status === "error" ? (
            <Callout.Root color="red">
              <Callout.Text>{workspaceState.message}</Callout.Text>
            </Callout.Root>
          ) : null}
          {workspaceState.status === "loaded" ? (
            <Flex direction="column" gap="1">
              <Heading as="h4" size="4">
                {workspaceState.value.name}
              </Heading>
              <Text as="p" color="gray">
                {workspaceState.value.slug}
              </Text>
              <Text as="p" color="gray">
                Created {formatDate(workspaceState.value.createdAt)}
              </Text>
            </Flex>
          ) : null}
          {rows.map((workspace) => (
            <Flex align="start" gap="3" key={workspace.id} justify="between">
              <Flex direction="column" gap="1">
                <Heading as="h4" size="4">
                  {workspace.name}
                </Heading>
                <Text as="p" color="gray">
                  {workspace.slug}
                </Text>
              </Flex>
              <time dateTime={workspace.updatedAtLabel}>{workspace.updatedAtLabel}</time>
            </Flex>
          ))}
        </Flex>
      </SettingsPanel>

      <SettingsPanel eyebrow="People" title="Members" titleId="settings-members-title">
        <Flex direction="column" gap="4">
          {settingsActionError === null ? null : (
            <Callout.Root color="red">
              <Callout.Text>{settingsActionError}</Callout.Text>
            </Callout.Root>
          )}
          {membersState.status === "idle" ? (
            <Text as="p" color="gray">
              Select a workspace to view its members.
            </Text>
          ) : null}
          {membersState.status === "loading" ? (
            <Text as="p" color="gray">
              Loading members.
            </Text>
          ) : null}
          {membersState.status === "error" ? (
            <Callout.Root color="red">
              <Callout.Text>{membersState.message}</Callout.Text>
            </Callout.Root>
          ) : null}
          {membersState.status === "loaded" && membersState.value.length === 0 ? (
            <Text as="p" color="gray">
              No members found.
            </Text>
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
        </Flex>
      </SettingsPanel>

      <SettingsPanel eyebrow="Workflow" title="Statuses" titleId="settings-statuses-title">
        <Flex direction="column" gap="4">
          {statusesState.status === "loading" ? (
            <Text as="p" color="gray">
              Loading statuses.
            </Text>
          ) : null}
          {statusesState.status === "error" ? (
            <Callout.Root color="red">
              <Callout.Text>{statusesState.message}</Callout.Text>
            </Callout.Root>
          ) : null}
          {statusesState.status === "loaded" && statusesState.value.length === 0 ? (
            <Text as="p" color="gray">
              No statuses found.
            </Text>
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
            <Text as="p" color="gray">
              Only workspace owners and admins can manage statuses.
            </Text>
          ) : null}
        </Flex>
      </SettingsPanel>

      <SettingsPanel eyebrow="Telegram" title="Mini App identity" titleId="settings-telegram-title">
        <Flex direction="column" gap="4">
          <TelegramLinkContent
            initDataAvailable={initDataAvailable}
            onLink={() => void linkTelegramIdentity()}
            state={telegramState}
          />
        </Flex>
      </SettingsPanel>

      <SettingsPanel eyebrow="Summary" title="Loaded context" titleId="settings-summary-title">
        <Text as="p" color="gray">
          {summary.selectedWorkspaceLabel}
        </Text>
        <Text as="p" color="gray">
          {summary.selectedProjectLabel}
        </Text>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label>Workspaces</DataList.Label>
            <DataList.Value>{summary.workspaceCount}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Projects</DataList.Label>
            <DataList.Value>{summary.projectCount}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Tasks</DataList.Label>
            <DataList.Value>{summary.taskCount}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Statuses</DataList.Label>
            <DataList.Value>{summary.statusCount}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Skills</DataList.Label>
            <DataList.Value>{summary.skillCount}</DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </SettingsPanel>
    </Grid>
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
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1">
          <Text as="p" color="gray">
            {eyebrow}
          </Text>
          <Heading as="h3" id={titleId} size="5">
            {title}
          </Heading>
        </Flex>
        {children}
      </Flex>
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
    <Flex align="start" gap="3" justify="between">
      <Flex direction="column" gap="1">
        <Heading as="h4" size="4">
          {member.displayName}
        </Heading>
        {member.email === null ? null : (
          <Text as="p" color="gray">
            {member.email}
          </Text>
        )}
      </Flex>
      {canManage && member.role !== "owner" ? (
        <Select.Root
          disabled={disabled}
          onValueChange={(value) => {
            if (isEditableMemberRole(value)) onRoleChange(value);
          }}
          value={member.role}
        >
          <Select.Trigger aria-label={`Role for ${member.displayName}`} />
          <Select.Content>
            {memberRoleOptions.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      ) : (
        <Text as="p" color="gray">
          {member.role}
        </Text>
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
      <Text as="p">
        {status.name} · {status.isDone ? "Done" : "Open"}
      </Text>
    );
  return (
    <Flex direction="column" gap="2">
      <TextField.Root
        aria-label={`Status name for ${status.name}`}
        disabled={disabled}
        onChange={(event) => setName(event.target.value)}
        value={name}
      />
      <TextField.Root
        aria-label={`Status color for ${status.name}`}
        disabled={disabled}
        onChange={(event) => setColor(event.target.value)}
        value={color}
      />
      <Flex align="center" gap="2">
        <Checkbox
          checked={isDone}
          disabled={disabled}
          id={`status-${status.id}-done`}
          onCheckedChange={(checked) => setIsDone(checked === true)}
        />
        <Text as="label" htmlFor={`status-${status.id}-done`}>
          Completed status
        </Text>
      </Flex>
      <Flex gap="2">
        <Button disabled={disabled} onClick={() => onUpdate({ color, isDone, name })}>
          Save status
        </Button>
        <Button color="red" disabled={disabled} onClick={onDelete}>
          Delete status
        </Button>
      </Flex>
    </Flex>
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
      <Flex direction="column" gap="2">
        <Heading as="h4" size="4">
          Add status
        </Heading>
        <TextField.Root
          aria-label="New status name"
          disabled={disabled}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        <TextField.Root
          aria-label="New status color"
          disabled={disabled}
          onChange={(event) => setColor(event.target.value)}
          value={color}
        />
        <Flex align="center" gap="2">
          <Checkbox
            checked={isDone}
            disabled={disabled}
            id="new-status-done"
            onCheckedChange={(checked) => setIsDone(checked === true)}
          />
          <Text as="label" htmlFor="new-status-done">
            Completed status
          </Text>
        </Flex>
        <Button disabled={disabled} type="submit">
          Create status
        </Button>
      </Flex>
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
  if (state.status === "loading")
    return (
      <Text as="p" color="gray">
        Checking link status.
      </Text>
    );
  if (state.status === "unavailable")
    return (
      <Callout.Root color="red">
        <Callout.Text>Connect the workspace API to view Telegram identity status.</Callout.Text>
      </Callout.Root>
    );
  if (state.status === "error")
    return (
      <Callout.Root color="red">
        <Callout.Text>{state.message}</Callout.Text>
      </Callout.Root>
    );
  if (state.status === "linked") {
    return (
      <>
        <Text>Telegram account {state.value.telegramId} is linked.</Text>
        <Text as="p" color="gray">
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
      <Text as="p" color="gray">
        Open this page from the Telegram Mini App to link your account. The browser cannot create or
        safely accept a Telegram identity on its own.
      </Text>
    );
  }
  return (
    <>
      <Text as="p" color="gray">
        Your verified Telegram Mini App session is ready to link.
      </Text>
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
