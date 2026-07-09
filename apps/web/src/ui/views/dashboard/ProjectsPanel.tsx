import { MBadge, MBox, MButton, MCard, MFlex, MGrid, MHeading, MInput, MText } from "@task/ui/app";
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
    <MCard
      aria-labelledby="project-title"
      gap="m"
      header={<DashboardPanelHeader eyebrow="Projects" title="Active" titleId="project-title" />}
      shadow={false}
    >
      <PanelForm onSubmit={handleProjectSubmit}>
        <MFlex
          as="label"
          align="stretch"
          direction="column"
          gap="xs"
          htmlFor="dashboard-project-title"
        >
          <MText as="span" mode="secondary" size="s">
            Project title
          </MText>
          <MInput
            aria-describedby="project-create-state"
            disabled={createProjectDisabled || isCreatingProject}
            id="dashboard-project-title"
            onChange={(event) => setProjectTitle(event.currentTarget.value)}
            placeholder="Create project"
            value={projectTitle}
          />
        </MFlex>
        <MButton
          before={<Plus aria-hidden="true" />}
          disabled={projectSubmitDisabled}
          type="submit"
        >
          {isCreatingProject ? "Creating" : "Create"}
        </MButton>
      </PanelForm>
      {createProjectState.status === "error" || createProjectState.status === "success" ? (
        <MBadge
          id="project-create-state"
          mode={createProjectState.status === "success" ? "success" : "error"}
        >
          {createProjectState.message}
        </MBadge>
      ) : (
        <MText as="p" id="project-create-state" mode="secondary" size="s">
          {createProjectDisabled
            ? "Load a workspace before creating projects."
            : "Creates a project in the selected workspace."}
        </MText>
      )}
      <MFlex align="stretch" direction="column" gap="s">
        {projects.map((project) => (
          <MBox as="article" key={project.id} paddingY="xs">
            <MHeading mode="h4">{project.title}</MHeading>
            <MText as="p" mode="secondary">
              {project.description ?? "No description"}
            </MText>
          </MBox>
        ))}
      </MFlex>
    </MCard>
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
    <MGrid
      alignItems="end"
      columnGap="s"
      columnTemplate="minmax(0, 1fr) auto"
      tag="form"
      onSubmit={onSubmit}
    >
      {children}
    </MGrid>
  );
}
