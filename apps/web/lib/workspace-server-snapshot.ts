import type { WorkspaceBootstrapRequest } from "./workspace-bootstrap";
import type { WorkspaceBootstrap, WorkspaceRequired } from "./workspace-contracts";

export type WorkspaceServerSnapshot = Readonly<{
  body: WorkspaceBootstrap | WorkspaceRequired;
  capturedAt: number;
  id: string;
  request: WorkspaceBootstrapRequest;
  requestKey: string;
}>;

export type ResolvedWorkspaceServerSnapshot = Readonly<{
  data: WorkspaceBootstrap | null;
  requiresWorkspace: boolean;
}>;

export function resolveWorkspaceServerSnapshot(
  current: WorkspaceBootstrap | null,
  currentRequest: WorkspaceBootstrapRequest | null,
  snapshot: WorkspaceServerSnapshot,
  latestClientMutationAt: number,
): ResolvedWorkspaceServerSnapshot {
  if ("requiresWorkspace" in snapshot.body) {
    return latestClientMutationAt > snapshot.capturedAt && current !== null
      ? { data: current, requiresWorkspace: false }
      : { data: null, requiresWorkspace: true };
  }
  if (
    current === null ||
    current.workspace.id !== snapshot.body.workspace.id ||
    latestClientMutationAt <= snapshot.capturedAt
  ) {
    return { data: snapshot.body, requiresWorkspace: false };
  }
  return {
    data: mergeStaleServerSnapshot(current, currentRequest, snapshot.body, snapshot.request),
    requiresWorkspace: false,
  };
}

function mergeStaleServerSnapshot(
  current: WorkspaceBootstrap,
  currentRequest: WorkspaceBootstrapRequest | null,
  incoming: WorkspaceBootstrap,
  incomingRequest: WorkspaceBootstrapRequest,
): WorkspaceBootstrap {
  const currentProjectData = new Map(
    current.projectData.map((project) => [project.projectId, project]),
  );
  const projectData = incoming.projectData.map((project) => {
    const existing = currentProjectData.get(project.projectId);
    if (
      existing === undefined ||
      !requestContainsProjectTasks(currentRequest, current, project.projectId)
    ) {
      return project;
    }
    return existing;
  });
  const incomingProjectIds = new Set(projectData.map((project) => project.projectId));
  for (const project of current.projectData) {
    if (!incomingProjectIds.has(project.projectId)) projectData.push(project);
  }

  return {
    ...incoming,
    agentRuns: current.agentRuns,
    availableWorkspaces: mergeById(incoming.availableWorkspaces, current.availableWorkspaces),
    confirmations: current.confirmations,
    currentMember: current.currentMember,
    myTasks: current.myTasks,
    projectData,
    projects: mergeById(incoming.projects, current.projects),
    statuses: mergeById(incoming.statuses, current.statuses),
    taskSkills:
      incomingRequest.includeTaskSkills && currentRequest?.includeTaskSkills !== true
        ? incoming.taskSkills
        : mergeById(incoming.taskSkills, current.taskSkills),
    views: mergeById(incoming.views, current.views),
    workspace: current.workspace,
  };
}

function requestContainsProjectTasks(
  request: WorkspaceBootstrapRequest | null,
  data: WorkspaceBootstrap,
  projectId: string,
): boolean {
  return (
    request?.includeProjectTasks === true &&
    data.projectData.some((project) => project.projectId === projectId)
  );
}

function mergeById<Item extends Readonly<{ id: string }>>(
  incoming: readonly Item[],
  current: readonly Item[],
): Item[] {
  const merged = new Map(incoming.map((item) => [item.id, item]));
  for (const item of current) merged.set(item.id, item);
  return [...merged.values()];
}
