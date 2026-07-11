import {
  Badge,
  Button,
  Card,
  DataList,
  Flex,
  Grid,
  Heading,
  Text,
  TextField,
} from "@radix-ui/themes";
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
      <Flex gap="3">
        <DashboardPanelHeader
          action={
            <Button
              aria-label="Open task table"
              size="1"
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
            <Flex gap="1">
              <Text color="gray">Task title</Text>
              <TextField.Root
                aria-describedby="task-create-state"
                disabled={createTaskDisabled || isSubmitting}
                id="dashboard-task-title"
                onChange={(event) => setTaskTitle(event.currentTarget.value)}
                placeholder="Add task to selected project"
                value={taskTitle}
              />
            </Flex>
          </label>
          <Button disabled={submitDisabled} type="submit">
            <Plus aria-hidden="true" />
            {isSubmitting ? "Adding" : "Add task"}
          </Button>
        </TaskCreateForm>
        {createTaskState.status === "error" || createTaskState.status === "success" ? (
          <Badge
            id="task-create-state"
            color={createTaskState.status === "success" ? "green" : "red"}
          >
            {createTaskState.message}
          </Badge>
        ) : (
          <Text id="task-create-state" color="gray">
            {createTaskDisabled
              ? "Select a loaded workspace project to add tasks."
              : "Creates a task in the selected project."}
          </Text>
        )}
        <DataList.Root aria-label="My Tasks summary">
          <DataList.Item>
            <DataList.Label>Tasks</DataList.Label>
            <DataList.Value>{myTaskSummary.taskCount}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Assigned</DataList.Label>
            <DataList.Value>{myTaskSummary.assignedTaskCount}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Due</DataList.Label>
            <DataList.Value>{myTaskSummary.dueTaskCount}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Recent</DataList.Label>
            <DataList.Value>{myTaskSummary.recentlyUpdatedTaskCount}</DataList.Value>
          </DataList.Item>
        </DataList.Root>
        <Flex gap="2">
          {myTaskRows.map((task) => (
            <article key={task.id}>
              <Grid columns="4" gap="2">
                <div>
                  <Heading as="h4">{task.title}</Heading>
                  <Text color="gray">{task.projectTitle}</Text>
                </div>
                <Badge>{task.assigneeLabel}</Badge>
                <Badge>{task.dueDateLabel}</Badge>
                <time dateTime={task.updatedAtLabel}>{task.updatedAtLabel}</time>
              </Grid>
            </article>
          ))}
        </Flex>
      </Flex>
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
      <Grid columns="2" gap="2">
        {children}
      </Grid>
    </form>
  );
}
