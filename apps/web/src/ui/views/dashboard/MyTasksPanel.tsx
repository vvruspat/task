import { ArrowRight, Plus } from "lucide-react";
import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { buildMyTaskRows, buildMyTaskSummary } from "../workspaceViewModels.js";
import type { FormSubmissionState, ProjectSummary, TaskSummary } from "./dashboardTypes.js";

type MyTasksPanelProps = {
  createTaskDisabled: boolean;
  createTaskState: FormSubmissionState;
  onCreateTask(title: string): Promise<void>;
  projects: ProjectSummary[];
  tasks: TaskSummary[];
};

export function MyTasksPanel({
  createTaskDisabled,
  createTaskState,
  onCreateTask,
  projects,
  tasks,
}: MyTasksPanelProps): ReactElement {
  const [taskTitle, setTaskTitle] = useState("");
  const trimmedTitle = taskTitle.trim();
  const isSubmitting = createTaskState.status === "submitting";
  const submitDisabled = createTaskDisabled || isSubmitting || trimmedTitle.length === 0;
  const myTaskRows = buildMyTaskRows(projects, tasks);
  const myTaskSummary = buildMyTaskSummary(tasks);

  const handleTaskSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (submitDisabled) {
      return;
    }

    void onCreateTask(trimmedTitle);
  };

  return (
    <section className="panel wide-panel" aria-labelledby="my-tasks-view-title">
      <div className="panel-header">
        <div>
          <p className="eyebrow">My Tasks</p>
          <h3 id="my-tasks-view-title">Personal queue</h3>
        </div>
        <button className="icon-button" title="Open task table" type="button">
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
      <form className="task-create-form" onSubmit={handleTaskSubmit}>
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
      <dl className="metric-list my-task-metrics" aria-label="My Tasks summary">
        <div>
          <dt>Tasks</dt>
          <dd>{myTaskSummary.taskCount}</dd>
        </div>
        <div>
          <dt>Assigned</dt>
          <dd>{myTaskSummary.assignedTaskCount}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{myTaskSummary.dueTaskCount}</dd>
        </div>
        <div>
          <dt>Recent</dt>
          <dd>{myTaskSummary.recentlyUpdatedTaskCount}</dd>
        </div>
      </dl>
      <div className="my-task-list">
        {myTaskRows.map((task) => (
          <article className="my-task-row" key={task.id}>
            <div>
              <h4>{task.title}</h4>
              <p>{task.projectTitle}</p>
            </div>
            <span>{task.assigneeLabel}</span>
            <span>{task.dueDateLabel}</span>
            <time dateTime={task.updatedAtLabel}>{task.updatedAtLabel}</time>
          </article>
        ))}
      </div>
    </section>
  );
}
