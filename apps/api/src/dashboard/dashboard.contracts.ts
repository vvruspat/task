import type {
  AgentRunSource,
  AgentRunStatus,
} from "../persistence/types/core-persistence.types.js";

export type DashboardOverview = {
  activeProjects: DashboardProject[];
  taskCounts: DashboardTaskCounts;
  recentActivity: DashboardActivity[];
  pendingConfirmations: DashboardConfirmation[];
  recentAgentRuns: DashboardAgentRun[];
};

export type DashboardProject = {
  id: string;
  title: string;
  status: string | null;
  updatedAt: Date;
};
export type DashboardTaskCounts = { assigned: number; overdue: number; dueSoon: number };
export type DashboardActivity = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  createdAt: Date;
};
export type DashboardConfirmation = {
  id: string;
  agentRunId: string;
  kind: string;
  expiresAt: Date;
  createdAt: Date;
};
export type DashboardAgentRun = {
  id: string;
  source: AgentRunSource;
  status: AgentRunStatus;
  inputText: string;
  createdAt: Date;
};

export const myTaskQueues = ["today", "upcoming", "overdue", "review"] as const;
export type MyTaskQueue = (typeof myTaskQueues)[number];
export type ListMyTasksInput = {
  queue?: MyTaskQueue;
  projectId?: string;
  statusId?: string;
  page: number;
  pageSize: number;
};
export type MyTaskItem = {
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  dueAt: Date | null;
  statusId: string | null;
  statusName: string | null;
  statusColor: string | null;
  position: string;
  updatedAt: Date;
};
export type MyTasksPage = { items: MyTaskItem[]; page: number; pageSize: number; total: number };
