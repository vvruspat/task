import { Plus } from "lucide-react";
import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
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
    <section className="panel" aria-labelledby="project-title">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h3 id="project-title">Active</h3>
        </div>
      </div>
      <form className="project-create-form" onSubmit={handleProjectSubmit}>
        <label>
          <span>Project title</span>
          <input
            aria-describedby="project-create-state"
            disabled={createProjectDisabled || isCreatingProject}
            onChange={(event) => setProjectTitle(event.currentTarget.value)}
            placeholder="Create project"
            value={projectTitle}
          />
        </label>
        <button className="primary-action" disabled={projectSubmitDisabled} type="submit">
          <Plus aria-hidden="true" />
          <span>{isCreatingProject ? "Creating" : "Create"}</span>
        </button>
      </form>
      {createProjectState.status === "error" || createProjectState.status === "success" ? (
        <p
          className={`project-create-state ${createProjectState.status}`}
          id="project-create-state"
        >
          {createProjectState.message}
        </p>
      ) : (
        <p className="project-create-state" id="project-create-state">
          {createProjectDisabled
            ? "Load a workspace before creating projects."
            : "Creates a project in the selected workspace."}
        </p>
      )}
      <div className="stacked-list">
        {projects.map((project) => (
          <article className="mini-row" key={project.id}>
            <h4>{project.title}</h4>
            <p>{project.description ?? "No description"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
