import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import {
  isUnprojectedIssueProject,
  unprojectedIssueProjectStatus,
} from "../../../../lib/system-project";

type CreateProjectPayload = {
  description: string;
  kind: "project";
  title: string;
  workspaceId: string;
};
type CreateTaskPayload = {
  assigneeUserId: string | null;
  description: string;
  kind: "task";
  labels: string[];
  projectId: string | null;
  statusId: string | null;
  title: string;
  workspaceId: string;
};
type CreateSkillPayload = {
  description: string;
  kind: "skill";
  title: string;
  workspaceId: string;
};
type CreatePayload = CreateProjectPayload | CreateTaskPayload | CreateSkillPayload;

function isBasePayload(
  value: unknown,
): value is { description: string; kind: unknown; title: string; workspaceId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "description" in value &&
    "kind" in value &&
    "title" in value &&
    "workspaceId" in value &&
    typeof value.description === "string" &&
    typeof value.title === "string" &&
    typeof value.workspaceId === "string"
  );
}
function isCreatePayload(value: unknown): value is CreatePayload {
  if (!isBasePayload(value)) return false;
  if (value.kind === "project" || value.kind === "skill") return true;
  return (
    value.kind === "task" &&
    "assigneeUserId" in value &&
    (typeof value.assigneeUserId === "string" || value.assigneeUserId === null) &&
    "labels" in value &&
    Array.isArray(value.labels) &&
    value.labels.every((label) => typeof label === "string") &&
    "projectId" in value &&
    (typeof value.projectId === "string" || value.projectId === null) &&
    "statusId" in value &&
    (typeof value.statusId === "string" || value.statusId === null)
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const trustedUserId = process.env["TASK_USER_ID"];
  if (trustedUserId === undefined || trustedUserId.trim().length === 0)
    return NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 });
  const payload: unknown = await request.json();
  if (!isCreatePayload(payload) || payload.title.trim().length === 0)
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  const api = createTaskApiClient({
    baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
    fetch,
    trustedUserId,
  });
  try {
    if (payload.kind === "project")
      return NextResponse.json(
        await api.createProject({
          workspaceId: payload.workspaceId,
          body: { title: payload.title.trim(), description: nullableText(payload.description) },
        }),
        { status: 201 },
      );
    if (payload.kind === "task") {
      const project = await resolveTaskProject(api, payload.workspaceId, payload.projectId);
      const task = await api.createTask({
        workspaceId: payload.workspaceId,
        projectId: project.id,
        body: {
          title: payload.title.trim(),
          assigneeUserId: payload.assigneeUserId,
          description: nullableText(payload.description),
          metadata: { labels: normalizeLabels(payload.labels) },
          ...(payload.statusId === null ? {} : { statusId: payload.statusId }),
        },
      });
      return NextResponse.json({ ...task, projectKey: project.key }, { status: 201 });
    }
    return NextResponse.json(
      await api.createTaskSkill({
        workspaceId: payload.workspaceId,
        body: {
          name: payload.title.trim(),
          description: nullableText(payload.description),
          definition: { subtasks: [{ title: "Новая подзадача" }] },
        },
      }),
      { status: 201 },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof TaskApiClientError ? error.message : "Unable to create item." },
      { status: 502 },
    );
  }
}

async function resolveTaskProject(
  api: ReturnType<typeof createTaskApiClient>,
  workspaceId: string,
  projectId: string | null,
): Promise<{ id: string; key: string }> {
  const projects = await api.listProjects({ workspaceId });
  if (projectId !== null) {
    const project = projects.find((item) => item.id === projectId);
    if (project === undefined) throw new Error("Project is unavailable.");
    return project;
  }
  const existing = projects.find(isUnprojectedIssueProject);
  if (existing !== undefined) return existing;
  return api.createProject({
    workspaceId,
    body: {
      title: "Без проекта",
      description: "Системный контейнер для issues без проекта.",
      status: unprojectedIssueProjectStatus,
    },
  });
}
function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeLabels(labels: string[]): string[] {
  const normalized = new Map<string, string>();
  for (const label of labels) {
    const trimmed = label.trim();
    const key = trimmed.toLocaleLowerCase("ru");
    if (trimmed.length > 0 && !normalized.has(key)) normalized.set(key, trimmed);
  }
  return [...normalized.values()];
}
