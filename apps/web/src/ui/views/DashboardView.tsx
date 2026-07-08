import type { components } from "@task/api-client";
import { ArrowRight, CircleDot, Clock3, Plus } from "lucide-react";
import type { FormEvent, ReactElement } from "react";
import { useState } from "react";

type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
type TaskSummary = components["schemas"]["TaskSummaryDto"];
type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];

type TaskCreateState =
  | {
      status: "idle";
    }
  | {
      status: "submitting";
    }
  | {
      message: string;
      status: "error" | "success";
    };

type DashboardViewProps = {
  createTaskDisabled: boolean;
  createTaskState: TaskCreateState;
  onCreateTask(title: string): Promise<void>;
  projects: ProjectSummary[];
  skills: TaskSkillSummary[];
  tasks: TaskSummary[];
};

export default function DashboardView({
  createTaskDisabled,
  createTaskState,
  onCreateTask,
  projects,
  skills,
  tasks,
}: DashboardViewProps): ReactElement {
  const [taskTitle, setTaskTitle] = useState("");
  const trimmedTitle = taskTitle.trim();
  const isSubmitting = createTaskState.status === "submitting";
  const submitDisabled = createTaskDisabled || isSubmitting || trimmedTitle.length === 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (submitDisabled) {
      return;
    }

    void onCreateTask(trimmedTitle);
  };

  return (
    <div className="content-grid">
      <section className="panel wide-panel" aria-labelledby="task-queue-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Queue</p>
            <h3 id="task-queue-title">Assigned work</h3>
          </div>
          <button className="icon-button" title="Open task table" type="button">
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
        <form className="task-create-form" onSubmit={handleSubmit}>
          <label>
            <span>Task title</span>
            <input
              aria-describedby="task-create-state"
              disabled={createTaskDisabled || isSubmitting}
              onChange={(event) => setTaskTitle(event.currentTarget.value)}
              placeholder="Add task to selected project"
              value={taskTitle}
            />
          </label>
          <button className="primary-action" disabled={submitDisabled} type="submit">
            <Plus aria-hidden="true" />
            <span>{isSubmitting ? "Adding" : "Add task"}</span>
          </button>
        </form>
        {createTaskState.status === "error" || createTaskState.status === "success" ? (
          <p className={`task-create-state ${createTaskState.status}`} id="task-create-state">
            {createTaskState.message}
          </p>
        ) : (
          <p className="task-create-state" id="task-create-state">
            {createTaskDisabled
              ? "Select a loaded workspace project to add tasks."
              : "Creates a task in the selected project."}
          </p>
        )}
        <div className="task-list">
          {tasks.map((task) => (
            <article className="task-row" key={task.id}>
              <CircleDot aria-hidden="true" className="state-icon" />
              <div>
                <h4>{task.title}</h4>
                <p>{task.description ?? "No description"}</p>
              </div>
              <span>{task.dueAt === null ? "No due date" : "Due soon"}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="project-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Projects</p>
            <h3 id="project-title">Active</h3>
          </div>
        </div>
        <div className="stacked-list">
          {projects.map((project) => (
            <article className="mini-row" key={project.id}>
              <h4>{project.title}</h4>
              <p>{project.description ?? "No description"}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="skills-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Templates</p>
            <h3 id="skills-title">Task skills</h3>
          </div>
        </div>
        <div className="stacked-list">
          {skills.map((skill) => (
            <article className="mini-row" key={skill.id}>
              <h4>{skill.name}</h4>
              <p>{skill.aliases.join(", ")}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel wide-panel" aria-labelledby="agent-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Agent</p>
            <h3 id="agent-title">Recent command</h3>
          </div>
          <Clock3 aria-hidden="true" className="muted-icon" />
        </div>
        <p className="agent-line">
          Create a song from the Song skill, preview subtasks, then wait for confirmation.
        </p>
      </section>
    </div>
  );
}
