import type {
  TaskActivityEvent,
  TaskApiClient,
  TaskAttachment,
  TaskComment,
  TaskDetail,
} from "@task/api-client";
import {
  Button,
  Callout,
  Card,
  Dialog,
  Flex,
  Heading,
  Select,
  Text,
  TextArea,
  TextField,
} from "@task/ui/app";
import { X } from "lucide-react";
import type { ChangeEvent, FormEvent, ReactElement, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  formatTaskDueDateInput,
  hasTaskDraftChanges,
  isTaskLinkUrlValid,
  taskStatusSelectValue,
  toTaskDueDateValue,
} from "./taskDetailViewModels.js";
import type { WorkspaceStatus } from "./types.js";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "loaded";
      task: TaskDetail;
      activity: TaskActivityEvent[];
      attachments: TaskAttachment[];
      comments: TaskComment[];
    };
type Feedback = { message: string; status: "error" | "success" };

export type TaskDetailDrawerProps = {
  client: TaskApiClient;
  onClose(): void;
  onDirtyChange(value: boolean): void;
  onTaskUpdated(task: TaskDetail): void;
  statuses: WorkspaceStatus[];
  projectId: string;
  taskId: string;
  workspaceId: string;
};

export function TaskDetailDrawer({
  client,
  onClose,
  onDirtyChange,
  onTaskUpdated,
  projectId,
  statuses,
  taskId,
  workspaceId,
}: TaskDetailDrawerProps): ReactElement {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const load = useCallback((): void => {
    setState({ status: "loading" });
    setFeedback(null);
    void Promise.all([
      client.getTask({ projectId, taskId, workspaceId }),
      client.listTaskActivity({ projectId, taskId, workspaceId }),
      client.listTaskAttachments({ projectId, taskId, workspaceId }),
      client.listTaskComments({ projectId, taskId, workspaceId }),
    ])
      .then(([task, activity, attachments, comments]) => {
        setState({ activity, attachments, comments, status: "loaded", task });
      })
      .catch((error: unknown) => setState({ message: readError(error), status: "error" }));
  }, [client, projectId, taskId, workspaceId]);

  useEffect(() => {
    load();
  }, [load]);
  const replaceTask = (task: TaskDetail, message: string): void => {
    setState((current) => (current.status === "loaded" ? { ...current, task } : current));
    onTaskUpdated(task);
    setFeedback({ message, status: "success" });
  };
  const scope = { projectId, taskId, workspaceId };

  return (
    <Dialog.Root
      onOpenChange={(isOpen): void => {
        if (!isOpen) onClose();
      }}
      open
    >
      <Dialog.Content aria-describedby="task-details-description" aria-label="Task details">
        <Flex align="start" direction="column" gap="4">
          <Flex align="center" justify="between">
            <div>
              <Dialog.Title>Task details</Dialog.Title>
              <Dialog.Description id="task-details-description">
                Review and update this task.
              </Dialog.Description>
            </div>
            <Button aria-label="Close task details" autoFocus onClick={onClose} variant="ghost">
              <X aria-hidden="true" />
            </Button>
          </Flex>
          {state.status === "loading" ? (
            <Text as="p" color="gray">
              Loading task details…
            </Text>
          ) : null}
          {state.status === "error" ? (
            <Callout.Root color="red">
              <Flex direction="column" gap="2">
                <Callout.Text>{state.message}</Callout.Text>
                <Button onClick={load} size="1">
                  Retry
                </Button>
              </Flex>
            </Callout.Root>
          ) : null}
          {feedback !== null ? (
            <Callout.Root color={feedback.status === "error" ? "red" : "green"}>
              <Callout.Text>{feedback.message}</Callout.Text>
            </Callout.Root>
          ) : null}
          {state.status === "loaded" ? (
            <TaskContent
              activity={state.activity}
              attachments={state.attachments}
              client={client}
              comments={state.comments}
              onCommentsChange={(comments) =>
                setState((current) =>
                  current.status === "loaded" ? { ...current, comments } : current,
                )
              }
              onAttachmentsChange={(attachments) =>
                setState((current) =>
                  current.status === "loaded" ? { ...current, attachments } : current,
                )
              }
              onFeedback={setFeedback}
              onDirtyChange={onDirtyChange}
              onTaskChange={replaceTask}
              scope={scope}
              statuses={statuses}
              task={state.task}
            />
          ) : null}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function TaskContent({
  activity,
  attachments,
  client,
  comments,
  onAttachmentsChange,
  onCommentsChange,
  onDirtyChange,
  onFeedback,
  onTaskChange,
  scope,
  statuses,
  task,
}: {
  activity: TaskActivityEvent[];
  attachments: TaskAttachment[];
  client: TaskApiClient;
  comments: TaskComment[];
  onAttachmentsChange(attachments: TaskAttachment[]): void;
  onCommentsChange(comments: TaskComment[]): void;
  onDirtyChange(value: boolean): void;
  onFeedback(feedback: Feedback): void;
  onTaskChange(task: TaskDetail, message: string): void;
  scope: { projectId: string; taskId: string; workspaceId: string };
  statuses: WorkspaceStatus[];
  task: TaskDetail;
}): ReactElement {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [comment, setComment] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
  }, [task.description, task.title]);
  useEffect(() => {
    onDirtyChange(
      hasTaskDraftChanges({
        comment,
        description,
        linkTitle,
        linkUrl,
        savedDescription: task.description ?? "",
        savedTitle: task.title,
        subtaskTitle,
        title,
      }),
    );
  }, [
    comment,
    description,
    linkTitle,
    linkUrl,
    onDirtyChange,
    subtaskTitle,
    task.description,
    task.title,
    title,
  ]);
  const saveDetails = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (busy || title.trim().length === 0) return;
    setBusy(true);
    void client
      .updateTask({
        ...scope,
        body: { description: description.trim() || null, title: title.trim() },
      })
      .then((updated) => onTaskChange(updated, "Task details saved."))
      .catch((error: unknown) => onFeedback({ message: readError(error), status: "error" }))
      .finally(() => setBusy(false));
  };
  const statusOptions = [
    { label: "No status", value: "none" },
    ...statuses.map((status) => ({ label: status.name, value: status.id })),
  ];
  const updateStatus = (value: string): void => {
    if (busy) return;
    setBusy(true);
    void client
      .updateTaskStatus({ ...scope, body: { statusId: value === "none" ? null : value } })
      .then((updated) => onTaskChange(updated, "Status updated."))
      .catch((error: unknown) => onFeedback({ message: readError(error), status: "error" }))
      .finally(() => setBusy(false));
  };
  const updateDueDate = (value: string): void => {
    if (busy) return;
    setBusy(true);
    void client
      .updateTaskDueDate({ ...scope, body: { dueAt: toTaskDueDateValue(value) } })
      .then((updated) => onTaskChange(updated, "Due date updated."))
      .catch((error: unknown) => onFeedback({ message: readError(error), status: "error" }))
      .finally(() => setBusy(false));
  };
  const addComment = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (busy || comment.trim().length === 0) return;
    setBusy(true);
    void client
      .createTaskComment({ ...scope, body: { body: comment.trim() } })
      .then((created) => {
        onCommentsChange([...comments, created]);
        setComment("");
        onFeedback({ message: "Comment added.", status: "success" });
      })
      .catch((error: unknown) => onFeedback({ message: readError(error), status: "error" }))
      .finally(() => setBusy(false));
  };
  const addLink = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (busy || !isTaskLinkUrlValid(linkUrl)) {
      if (!busy) onFeedback({ message: "Enter a valid http(s) link.", status: "error" });
      return;
    }
    setBusy(true);
    void client
      .createTaskLinkAttachment({
        ...scope,
        body: { title: linkTitle.trim() || null, url: linkUrl.trim() },
      })
      .then((created) => {
        onAttachmentsChange([...attachments, created]);
        setLinkUrl("");
        setLinkTitle("");
        onFeedback({ message: "Link attached.", status: "success" });
      })
      .catch((error: unknown) => onFeedback({ message: readError(error), status: "error" }))
      .finally(() => setBusy(false));
  };
  const addSubtask = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (busy || subtaskTitle.trim().length === 0) return;
    setBusy(true);
    void client
      .addTaskSubtasks({ ...scope, body: { subtasks: [{ title: subtaskTitle.trim() }] } })
      .then(() => {
        setSubtaskTitle("");
        onFeedback({ message: "Subtask created.", status: "success" });
      })
      .catch((error: unknown) => onFeedback({ message: readError(error), status: "error" }))
      .finally(() => setBusy(false));
  };
  const updateText =
    (setter: (value: string) => void) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
      setter(event.currentTarget.value);
  return (
    <>
      <form onSubmit={saveDetails}>
        <Flex direction="column" gap="2">
          <TextField.Root aria-label="Task title" onChange={updateText(setTitle)} value={title} />
          <TextArea
            aria-label="Task description"
            maxLength={5000}
            onChange={updateText(setDescription)}
            value={description}
          />
          <Flex align="center" gap="2">
            <Button disabled={busy || title.trim().length === 0} type="submit">
              {busy ? "Saving" : "Save"}
            </Button>
            <Select.Root
              disabled={busy}
              onValueChange={updateStatus}
              value={taskStatusSelectValue(task.statusId)}
            >
              <Select.Trigger aria-label="Task status" />
              <Select.Content>
                {statusOptions.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <TextField.Root
              aria-label="Due date"
              disabled={busy}
              onChange={(event) => updateDueDate(event.currentTarget.value)}
              type="date"
              value={formatTaskDueDateInput(task.dueAt)}
            />
          </Flex>
        </Flex>
      </form>
      <Callout.Root color="blue">
        <Callout.Text>
          Assignee editing is unavailable because the workspace API does not expose member
          identities to this view.
        </Callout.Text>
      </Callout.Root>
      <Section title="Subtasks">
        <form onSubmit={addSubtask}>
          <Flex align="center" gap="2">
            <TextField.Root
              aria-label="New subtask title"
              onChange={updateText(setSubtaskTitle)}
              value={subtaskTitle}
            />
            <Button disabled={busy || subtaskTitle.trim().length === 0} type="submit">
              Add subtask
            </Button>
          </Flex>
        </form>
      </Section>
      <Section title="Comments">
        <form onSubmit={addComment}>
          <Flex direction="column" gap="2">
            <TextArea aria-label="New comment" onChange={updateText(setComment)} value={comment} />
            <Button disabled={busy || comment.trim().length === 0} type="submit">
              Comment
            </Button>
          </Flex>
        </form>
        {comments.map((item) => (
          <Card key={item.id}>
            <Flex direction="column" gap="1">
              <Text as="p">{item.body}</Text>
              <Text as="p" color="gray">
                {item.createdAt.slice(0, 10)}
              </Text>
            </Flex>
          </Card>
        ))}
      </Section>
      <Section title="Attachments">
        <form onSubmit={addLink}>
          <Flex direction="column" gap="2">
            <TextField.Root
              aria-label="Link URL"
              onChange={updateText(setLinkUrl)}
              placeholder="https://…"
              type="url"
              value={linkUrl}
            />
            <TextField.Root
              aria-label="Link title"
              onChange={updateText(setLinkTitle)}
              value={linkTitle}
            />
            <Button disabled={busy || linkUrl.trim().length === 0} type="submit">
              Attach link
            </Button>
          </Flex>
        </form>
        {attachments.map((item) =>
          item.url ? (
            <Button
              key={item.id}
              onClick={() => window.open(item.url ?? "", "_blank", "noopener,noreferrer")}
              variant="ghost"
            >
              {item.title ?? item.url}
            </Button>
          ) : (
            <Text as="p" key={item.id}>
              {item.title ?? item.kind}
            </Text>
          ),
        )}
      </Section>
      <Section title="Activity">
        {activity.length === 0 ? (
          <Text as="p" color="gray">
            No activity recorded.
          </Text>
        ) : (
          activity.map((item) => (
            <Flex justify="between" key={item.id}>
              <Text as="p">{item.eventType}</Text>
              <time dateTime={item.createdAt}>{item.createdAt.slice(0, 10)}</time>
            </Flex>
          ))
        )}
      </Section>
    </>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }): ReactElement {
  return (
    <Flex direction="column" gap="2">
      <Heading as="h3" size="5">
        {title}
      </Heading>
      {children}
    </Flex>
  );
}
function readError(error: unknown): string {
  return error instanceof Error ? error.message : "The task action could not be completed.";
}
