import {
  MBadge,
  MBox,
  MButton,
  MCard,
  MDescriptionList,
  MFlex,
  MGrid,
  MHeading,
  MInput,
  MText,
} from "@task/ui/app";
import { ArrowRight, Plus } from "lucide-react";
import type { FormEvent, ReactElement, ReactNode } from "react";
import { useState } from "react";
import { buildMyTaskRows, buildMyTaskSummary } from "../workspaceViewModels.js";
import { DashboardPanelHeader } from "./DashboardPanelHeader.js";
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
    <MCard
      aria-labelledby="my-tasks-view-title"
      gap="m"
      header={
        <DashboardPanelHeader
          action={
            <MButton
              aria-label="Open task table"
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
        />
      }
      shadow={false}
    >
      <MGridForm onSubmit={handleTaskSubmit}>
        <MFlex
          as="label"
          align="stretch"
          direction="column"
          gap="xs"
          htmlFor="dashboard-task-title"
        >
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
        </MFlex>
        <MButton before={<Plus aria-hidden="true" />} disabled={submitDisabled} type="submit">
          {isSubmitting ? "Adding" : "Add task"}
        </MButton>
      </MGridForm>
      {createTaskState.status === "error" || createTaskState.status === "success" ? (
        <MBadge
          id="task-create-state"
          mode={createTaskState.status === "success" ? "success" : "error"}
        >
          {createTaskState.message}
        </MBadge>
      ) : (
        <MText as="p" id="task-create-state" mode="secondary" size="s">
          {createTaskDisabled
            ? "Select a loaded workspace project to add tasks."
            : "Creates a task in the selected project."}
        </MText>
      )}
      <MDescriptionList
        aria-label="My Tasks summary"
        options={[
          { title: "Tasks", description: myTaskSummary.taskCount },
          { title: "Assigned", description: myTaskSummary.assignedTaskCount },
          { title: "Due", description: myTaskSummary.dueTaskCount },
          { title: "Recent", description: myTaskSummary.recentlyUpdatedTaskCount },
        ]}
        size="s"
      />
      <MFlex align="stretch" direction="column" gap="s">
        {myTaskRows.map((task) => (
          <MGrid
            tag="article"
            alignItems="center"
            columnGap="s"
            columnTemplate="minmax(0, 1fr) auto auto auto"
            key={task.id}
          >
            <MBox>
              <MHeading mode="h4">{task.title}</MHeading>
              <MText as="p" mode="secondary">
                {task.projectTitle}
              </MText>
            </MBox>
            <MBadge mode="transparent">{task.assigneeLabel}</MBadge>
            <MBadge mode="transparent">{task.dueDateLabel}</MBadge>
            <time dateTime={task.updatedAtLabel}>{task.updatedAtLabel}</time>
          </MGrid>
        ))}
      </MFlex>
    </MCard>
  );
}

function MGridForm({
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
