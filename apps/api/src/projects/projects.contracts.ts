export type ProjectSummary = {
  id: string;
  workspaceId: string;
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
