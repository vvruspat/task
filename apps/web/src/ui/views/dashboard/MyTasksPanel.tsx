import { MBox, MButton, MGrid, MHeading, MInput, MText } from "@task/ui";
import { ArrowRight, Plus } from "lucide-react";
import type { FormEvent, ReactElement, ReactNode } from "react";
import { useState } from "react";
import { buildMyTaskRows, buildMyTaskSummary } from "../workspaceViewModels.js";
import { DashboardMetrics, DashboardPanel } from "./DashboardPrimitives.js";
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
    <DashboardPanel
      action={
        <MButton
          aria-label="Open task table"
          className="icon-button"
          mode="secondary"
          noPadding
          title="Open task table"
          type="button"
        >
          <ArrowRight aria-hidden="true" />
        </MButton>
      }
      eyebrow="My Tasks"
      title="Personal queue"
      titleId="my-tasks-view-title"
      wide
    >
      <MGridForm className="task-create-form" onSubmit={handleTaskSubmit}>
        <label htmlFor="dashboard-task-title">
          <MText as="span" mode="secondary" size="s">
            Task title
          </MText>
          <MInput
            aria-describedby="task-create-state"
            disabled={createTaskDisabled || isSubmitting}
            id="dashboard-task-title"
            onChange={(event) => setTaskTitle(event.currentTarget.value)}
            placeholder="Add task to selected project"
            value={taskTitle}
          />
        </label>
        <MButton before={<Plus aria-hidden="true" />} disabled={submitDisabled} type="submit">
          {isSubmitting ? "Adding" : "Add task"}
        </MButton>
      </MGridForm>
      {createTaskState.status === "error" || createTaskState.status === "success" ? (
        <MText
          as="p"
          className={`task-create-state ${createTaskState.status}`}
          id="task-create-state"
          mode="secondary"
        >
          {createTaskState.message}
        </MText>
      ) : (
        <MText as="p" className="task-create-state" id="task-create-state" mode="secondary">
          {createTaskDisabled
            ? "Select a loaded workspace project to add tasks."
            : "Creates a task in the selected project."}
        </MText>
      )}
      <DashboardMetrics
        ariaLabel="My Tasks summary"
        className="my-task-metrics"
        items={[
          { label: "Tasks", value: myTaskSummary.taskCount },
          { label: "Assigned", value: myTaskSummary.assignedTaskCount },
          { label: "Due", value: myTaskSummary.dueTaskCount },
          { label: "Recent", value: myTaskSummary.recentlyUpdatedTaskCount },
        ]}
      />
      <MBox className="my-task-list">
        {myTaskRows.map((task) => (
          <MBox as="article" className="my-task-row" key={task.id}>
            <MBox>
              <MHeading mode="h4">{task.title}</MHeading>
              <MText as="p" mode="secondary">
                {task.projectTitle}
              </MText>
            </MBox>
            <MText as="span">{task.assigneeLabel}</MText>
            <MText as="span">{task.dueDateLabel}</MText>
            <time dateTime={task.updatedAtLabel}>{task.updatedAtLabel}</time>
          </MBox>
        ))}
      </MBox>
    </DashboardPanel>
  );
}

function MGridForm({
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
