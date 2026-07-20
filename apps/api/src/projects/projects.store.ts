import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectSummary,
  UpdateProjectInput,
} from "./projects.contracts.js";

export type ProjectCreateResult =
  | {
      project: ProjectDetail;
      status: "created";
    }
  | {
      status: "workspace_not_found";
    }
  | {
      status: "forbidden";
    };

export type ProjectArchiveResult =
  | {
      project: ProjectDetail;
      status: "archived";
    }
  | {
      status: "project_not_found";
    }
  | {
      status: "forbidden";
    };

export type ProjectDeleteResult =
  | { project: ProjectDetail; status: "deleted" }
  | { status: "project_not_found" | "forbidden" };

export type ProjectUpdateResult =
  | {
      project: ProjectDetail;
      status: "updated";
    }
  | {
      status: "project_not_found";
    }
  | {
      status: "forbidden";
    };

export type ProjectReadStore = {
  listActiveForWorkspace(workspaceId: string, userId: string): Promise<ProjectSummary[] | null>;
  getForWorkspace(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectDetail | null>;
  createForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateProjectInput,
  ): Promise<ProjectCreateResult>;
  updateForWorkspace(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectUpdateResult>;
  archiveForWorkspace(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectArchiveResult>;
  deleteForWorkspace(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectDeleteResult>;
};
