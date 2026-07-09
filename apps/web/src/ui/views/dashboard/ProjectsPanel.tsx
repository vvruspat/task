import { MBox, MButton, MFlex, MGrid, MHeading, MInput, MText } from "@task/ui";
import { Plus } from "lucide-react";
import type { FormEvent, ReactElement, ReactNode } from "react";
import { useState } from "react";
import { DashboardPanel } from "./DashboardPrimitives.js";
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
    <DashboardPanel eyebrow="Projects" title="Active" titleId="project-title">
      <PanelForm className="project-create-form" onSubmit={handleProjectSubmit}>
        <label htmlFor="dashboard-project-title">
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
        </label>
        <MButton
          before={<Plus aria-hidden="true" />}
          disabled={projectSubmitDisabled}
          type="submit"
        >
          {isCreatingProject ? "Creating" : "Create"}
        </MButton>
      </PanelForm>
      {createProjectState.status === "error" || createProjectState.status === "success" ? (
        <MText
          as="p"
          className={`project-create-state ${createProjectState.status}`}
          id="project-create-state"
          mode="secondary"
        >
          {createProjectState.message}
        </MText>
      ) : (
        <MText as="p" className="project-create-state" id="project-create-state" mode="secondary">
          {createProjectDisabled
            ? "Load a workspace before creating projects."
            : "Creates a project in the selected workspace."}
        </MText>
      )}
      <MFlex align="stretch" className="stacked-list" direction="column" gap="s">
        {projects.map((project) => (
          <MBox as="article" className="mini-row" key={project.id}>
            <MHeading mode="h4">{project.title}</MHeading>
            <MText as="p" mode="secondary">
              {project.description ?? "No description"}
            </MText>
          </MBox>
        ))}
      </MFlex>
    </DashboardPanel>
  );
}

function PanelForm({
  children,
  className,
  onSubmit,
}: {
  children: ReactNode;
  className: string;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
}): ReactElement {
  return (
    <MGrid
      alignItems="end"
      className={className}
      columnGap="s"
      columnTemplate="minmax(0, 1fr) auto"
      tag="form"
      onSubmit={onSubmit}
    >
      {children}
    </MGrid>
  );
}
