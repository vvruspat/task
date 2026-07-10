import { Badge, Button, Card, Grid, Heading, Input, Stack, Text } from "@task/ui/app";
import { Plus } from "lucide-react";
import type { FormEvent, ReactElement, ReactNode } from "react";
import { useState } from "react";
import { DashboardPanelHeader } from "./DashboardPanelHeader.js";
import type { FormSubmissionState, ProjectSummary } from "./dashboardTypes.js";

type ProjectsPanelProps = {
  createProjectDisabled: boolean;
  createProjectState: FormSubmissionState;
  onCreateProject(title: string): Promise<void>;
  projects: ProjectSummary[];
};

export function ProjectsPanel({
  createProjectDisabled,
  createProjectState,
  onCreateProject,
  projects,
}: ProjectsPanelProps): ReactElement {
  const [projectTitle, setProjectTitle] = useState("");
  const trimmedProjectTitle = projectTitle.trim();
  const isCreatingProject = createProjectState.status === "submitting";
  const projectSubmitDisabled =
    createProjectDisabled || isCreatingProject || trimmedProjectTitle.length === 0;

  const handleProjectSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (projectSubmitDisabled) {
      return;
    }

    void onCreateProject(trimmedProjectTitle);
  };

  return (
    <Card aria-labelledby="project-title">
      <Stack gap="md">
        <DashboardPanelHeader eyebrow="Projects" title="Active" titleId="project-title" />
        <PanelForm onSubmit={handleProjectSubmit}>
          <label htmlFor="dashboard-project-title">
            <Stack gap="xs">
              <Text tone="muted">Project title</Text>
              <Input
                aria-describedby="project-create-state"
                disabled={createProjectDisabled || isCreatingProject}
                id="dashboard-project-title"
                onChange={(event) => setProjectTitle(event.currentTarget.value)}
                placeholder="Create project"
                value={projectTitle}
              />
            </Stack>
          </label>
          <Button disabled={projectSubmitDisabled} type="submit">
            <Plus aria-hidden="true" />
            {isCreatingProject ? "Creating" : "Create"}
          </Button>
        </PanelForm>
        {createProjectState.status === "error" || createProjectState.status === "success" ? (
          <Badge
            id="project-create-state"
            tone={createProjectState.status === "success" ? "success" : "danger"}
          >
            {createProjectState.message}
          </Badge>
        ) : (
          <Text id="project-create-state" tone="muted">
            {createProjectDisabled
              ? "Load a workspace before creating projects."
              : "Creates a project in the selected workspace."}
          </Text>
        )}
        <Stack gap="sm">
          {projects.map((project) => (
            <article key={project.id}>
              <Heading level={4}>{project.title}</Heading>
              <Text tone="muted">{project.description ?? "No description"}</Text>
            </article>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

function PanelForm({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
}): ReactElement {
  return (
    <form onSubmit={onSubmit}>
      <Grid columns={2} gap="sm">
        {children}
      </Grid>
    </form>
  );
}
