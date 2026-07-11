import { Badge, Button, Card, Flex, Grid, Heading, Text, TextField } from "@radix-ui/themes";
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
      <Flex gap="3">
        <DashboardPanelHeader eyebrow="Projects" title="Active" titleId="project-title" />
        <PanelForm onSubmit={handleProjectSubmit}>
          <label htmlFor="dashboard-project-title">
            <Flex gap="1">
              <Text color="gray">Project title</Text>
              <TextField.Root
                aria-describedby="project-create-state"
                disabled={createProjectDisabled || isCreatingProject}
                id="dashboard-project-title"
                onChange={(event) => setProjectTitle(event.currentTarget.value)}
                placeholder="Create project"
                value={projectTitle}
              />
            </Flex>
          </label>
          <Button disabled={projectSubmitDisabled} type="submit">
            <Plus aria-hidden="true" />
            {isCreatingProject ? "Creating" : "Create"}
          </Button>
        </PanelForm>
        {createProjectState.status === "error" || createProjectState.status === "success" ? (
          <Badge
            id="project-create-state"
            color={createProjectState.status === "success" ? "green" : "red"}
          >
            {createProjectState.message}
          </Badge>
        ) : (
          <Text id="project-create-state" color="gray">
            {createProjectDisabled
              ? "Load a workspace before creating projects."
              : "Creates a project in the selected workspace."}
          </Text>
        )}
        <Flex gap="2">
          {projects.map((project) => (
            <article key={project.id}>
              <Heading as="h4">{project.title}</Heading>
              <Text color="gray">{project.description ?? "No description"}</Text>
            </article>
          ))}
        </Flex>
      </Flex>
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
      <Grid columns="2" gap="2">
        {children}
      </Grid>
    </form>
  );
}
