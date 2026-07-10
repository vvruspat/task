import type { DataTableColumn } from "@task/ui/app";
import { Card, ContentGrid, DataTable, DescriptionList, Heading, Stack, Text } from "@task/ui/app";
import type { ReactElement } from "react";
import type { ProjectSummary, TaskSkillSummary, TaskSummary, WorkspaceRoute } from "./types.js";

export type FallbackWorkspaceRouteViewProps = {
  projects: ProjectSummary[];
  route: WorkspaceRoute;
  skills: TaskSkillSummary[];
  tasks: TaskSummary[];
};

type FallbackRow = {
  id: string;
  ownerLabel: string;
  projectTitle: string;
  statusLabel: string;
  title: string;
};

export function FallbackWorkspaceRouteView({
  projects,
  route,
  skills,
  tasks,
}: FallbackWorkspaceRouteViewProps): ReactElement {
  const visibleRows = route.id === "templates" ? skills.length : tasks.length;
  const columns: readonly DataTableColumn<FallbackRow>[] = [
    { cell: (row) => row.title, header: "Name", id: "title" },
    { cell: (row) => row.projectTitle, header: "Project", id: "project" },
    { cell: (row) => row.statusLabel, header: "Status", id: "status" },
    { cell: (row) => row.ownerLabel, header: "Owner", id: "owner" },
  ];
  const rows: FallbackRow[] = tasks.map((task) => ({
    id: task.id,
    ownerLabel: task.assigneeUserId === null ? "Unassigned" : "Assigned",
    projectTitle:
      projects.find((project) => project.id === task.projectId)?.title ?? "Unknown project",
    statusLabel: "Open",
    title: task.title,
  }));

  return (
    <ContentGrid>
      <Card aria-labelledby="workspace-view-title">
        <Stack>
          <Stack gap="xs">
            <Text tone="muted">Lazy view</Text>
            <Heading id="workspace-view-title">{route.label}</Heading>
          </Stack>
          <DataTable
            aria-labelledby="workspace-view-title"
            columns={columns}
            emptyState="No rows loaded"
            getRowId={(row) => row.id}
            rows={rows}
          />
        </Stack>
      </Card>

      <Card aria-labelledby="view-summary-title">
        <Stack>
          <Stack gap="xs">
            <Text tone="muted">Summary</Text>
            <Heading id="view-summary-title">Ready for data</Heading>
          </Stack>
          <Text tone="muted">{route.description}</Text>
          <DescriptionList
            items={[
              { label: "Rows", value: visibleRows },
              { label: "Projects", value: projects.length },
              { label: "Skills", value: skills.length },
            ]}
          />
        </Stack>
      </Card>
    </ContentGrid>
  );
}
