import {
  Badge,
  Button,
  Card,
  DescriptionList,
  Grid,
  Heading,
  Input,
  Stack,
  Text,
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
    <Card aria-labelledby="my-tasks-view-title">
      <Stack gap="md">
        <DashboardPanelHeader
          action={
            <Button
              aria-label="Open task table"
              size="sm"
              title="Open task table"
              type="button"
              variant="ghost"
            >
              <ArrowRight aria-hidden="true" />
            </Button>
          }
          eyebrow="My Tasks"
          title="Personal queue"
          titleId="my-tasks-view-title"
        />
        <TaskCreateForm onSubmit={handleTaskSubmit}>
          <label htmlFor="dashboard-task-title">
            <Stack gap="xs">
              <Text tone="muted">Task title</Text>
              <Input
                aria-describedby="task-create-state"
                disabled={createTaskDisabled || isSubmitting}
                id="dashboard-task-title"
                onChange={(event) => setTaskTitle(event.currentTarget.value)}
                placeholder="Add task to selected project"
                value={taskTitle}
              />
            </Stack>
          </label>
          <Button disabled={submitDisabled} type="submit">
            <Plus aria-hidden="true" />
            {isSubmitting ? "Adding" : "Add task"}
          </Button>
        </TaskCreateForm>
        {createTaskState.status === "error" || createTaskState.status === "success" ? (
          <Badge
            id="task-create-state"
            tone={createTaskState.status === "success" ? "success" : "danger"}
          >
            {createTaskState.message}
          </Badge>
        ) : (
          <Text id="task-create-state" tone="muted">
            {createTaskDisabled
              ? "Select a loaded workspace project to add tasks."
              : "Creates a task in the selected project."}
          </Text>
        )}
        <DescriptionList
          aria-label="My Tasks summary"
          items={[
            { label: "Tasks", value: myTaskSummary.taskCount },
            { label: "Assigned", value: myTaskSummary.assignedTaskCount },
            { label: "Due", value: myTaskSummary.dueTaskCount },
            { label: "Recent", value: myTaskSummary.recentlyUpdatedTaskCount },
          ]}
        />
        <Stack gap="sm">
          {myTaskRows.map((task) => (
            <article key={task.id}>
              <Grid columns={4} gap="sm">
                <div>
                  <Heading level={4}>{task.title}</Heading>
                  <Text tone="muted">{task.projectTitle}</Text>
                </div>
                <Badge>{task.assigneeLabel}</Badge>
                <Badge>{task.dueDateLabel}</Badge>
                <time dateTime={task.updatedAtLabel}>{task.updatedAtLabel}</time>
              </Grid>
            </article>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

function TaskCreateForm({
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
