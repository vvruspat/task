import type { TaskSummary, WorkspaceStatus } from "@task/api-client";
import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "../../../../lib/auth";
import { isUnprojectedIssueProject } from "../../../../lib/system-project";
import { mapWithConcurrency } from "../../../../lib/workspace-bootstrap";
import type { ApiFailure } from "../../../../lib/workspace-contracts";
import {
  collectWorkspaceTaskLabels,
  type WorkspaceCreateContext,
} from "../../../../lib/workspace-create-context";

const apiBaseUrl = readEnvironment("TASK_API_BASE_URL") ?? "http://localhost:3000";
const projectLoadConcurrency = 4;

type ProjectCreateData = Readonly<{
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
}>;

export async function GET(
  request: Request,
): Promise<NextResponse<WorkspaceCreateContext | ApiFailure>> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  const workspaceId = new URL(request.url).searchParams.get("workspaceId")?.trim();
  if (workspaceId === undefined || workspaceId.length === 0) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    const projects = await api.listProjects({ workspaceId });
    const loaded = await mapWithConcurrency(
      projects,
      projectLoadConcurrency,
      async (project): Promise<ProjectCreateData> => {
        const [statuses, tasks] = await Promise.all([
          api.listStatuses({ workspaceId, projectId: project.id }),
          api.listTasks({ workspaceId, projectId: project.id }),
        ]);
        return { statuses, tasks };
      },
    );
    return NextResponse.json({
      labels: collectWorkspaceTaskLabels(loaded.flatMap((project) => project.tasks)),
      projectlessProjectId: projects.find(isUnprojectedIssueProject)?.id ?? null,
      statuses: loaded.flatMap((project) => project.statuses),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof TaskApiClientError
            ? error.message
            : "Unable to load task creation options.",
      },
      { status: 502 },
    );
  }
}

function readEnvironment(name: "TASK_API_BASE_URL"): string | undefined {
  return process.env[name];
}
