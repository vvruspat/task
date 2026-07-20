export type ProjectSummary = {
  id: string;
  workspaceId: string;
  key: string;
  slug: string;
  title: string;
  description: string | null;
  status: string | null;
  position: string | null;
  createdByUserId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectDetail = ProjectSummary;

export type CreateProjectInput = {
  title: string;
  description?: string | null;
  status?: string | null;
  position?: string | null;
};

export type UpdateProjectInput = {
  title?: string;
  description?: string | null;
  status?: string | null;
  position?: string | null;
};
