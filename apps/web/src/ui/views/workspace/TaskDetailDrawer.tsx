import type {
  TaskActivityEvent,
  TaskApiClient,
  TaskAttachment,
  TaskComment,
  TaskDetail,
} from "@task/api-client";
import {
  MAlert,
  MBox,
  MButton,
  MDrawer,
  MFlex,
  MHeading,
  MInput,
  MSelect,
  type MSelectOption,
  MText,
  MTextarea,
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
    <MDrawer aria-label="Task details" isOpen onClose={onClose}>
      <MFlex align="start" direction="column" gap="m">
        <MFlex justify="space-between" wrap="nowrap">
          <MText as="span" mode="secondary">
            Task details
          </MText>
          <MButton
            aria-label="Close task details"
            mode="round"
            noPadding
            onClick={onClose}
            autoFocus
          >
            <X aria-hidden="true" />
          </MButton>
        </MFlex>
        {state.status === "loading" ? (
          <MText as="p" mode="secondary">
            Loading task details…
          </MText>
        ) : null}
        {state.status === "error" ? (
          <MAlert mode="error">
            <MText as="p">{state.message}</MText>
            <MButton onClick={load}>Retry</MButton>
          </MAlert>
        ) : null}
        {feedback !== null ? (
          <MAlert mode={feedback.status}>
            <MText as="p">{feedback.message}</MText>
          </MAlert>
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
      </MFlex>
    </MDrawer>
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
  const statusOptions: MSelectOption[] = [
    { key: "none", value: "No status" },
    ...statuses.map((status) => ({ key: status.id, value: status.name })),
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
        <MFlex align="stretch" direction="column" gap="s">
          <MInput aria-label="Task title" onChange={updateText(setTitle)} value={title} />
          <MTextarea
            aria-label="Task description"
            maxLength={5000}
            onChange={updateText(setDescription)}
            value={description}
          />
          <MFlex gap="s">
            <MButton disabled={busy || title.trim().length === 0} type="submit">
              {busy ? "Saving" : "Save"}
            </MButton>
            <MSelect
              aria-label="Task status"
              disabled={busy}
              onValueChange={updateStatus}
              options={statusOptions}
              value={taskStatusSelectValue(task.statusId)}
            />
            <MInput
              aria-label="Due date"
              disabled={busy}
              onChange={(event) => updateDueDate(event.currentTarget.value)}
              type="date"
              value={formatTaskDueDateInput(task.dueAt)}
            />
          </MFlex>
        </MFlex>
      </form>
      <MAlert mode="info">
        <MText as="p">
          Assignee editing is unavailable because the workspace API does not expose member
          identities to this view.
        </MText>
      </MAlert>
      <Section title="Subtasks">
        <form onSubmit={addSubtask}>
          <MFlex gap="s">
            <MInput
              aria-label="New subtask title"
              onChange={updateText(setSubtaskTitle)}
              value={subtaskTitle}
            />
            <MButton disabled={busy || subtaskTitle.trim().length === 0} type="submit">
              Add subtask
            </MButton>
          </MFlex>
        </form>
      </Section>
      <Section title="Comments">
        <form onSubmit={addComment}>
          <MFlex align="stretch" direction="column" gap="s">
            <MTextarea aria-label="New comment" onChange={updateText(setComment)} value={comment} />
            <MButton disabled={busy || comment.trim().length === 0} type="submit">
              Comment
            </MButton>
          </MFlex>
        </form>
        {comments.map((item) => (
          <MBox key={item.id}>
            <MText as="p">{item.body}</MText>
            <MText as="span" mode="secondary" size="s">
              {item.createdAt.slice(0, 10)}
            </MText>
          </MBox>
        ))}
      </Section>
      <Section title="Attachments">
        <form onSubmit={addLink}>
          <MFlex align="stretch" direction="column" gap="s">
            <MInput
              aria-label="Link URL"
              onChange={updateText(setLinkUrl)}
              placeholder="https://…"
              type="url"
              value={linkUrl}
            />
            <MInput aria-label="Link title" onChange={updateText(setLinkTitle)} value={linkTitle} />
            <MButton disabled={busy || linkUrl.trim().length === 0} type="submit">
              Attach link
            </MButton>
          </MFlex>
        </form>
        {attachments.map((item) =>
          item.url ? (
            <MButton
              key={item.id}
              mode="transparent"
              noPadding
              onClick={() => window.open(item.url ?? "", "_blank", "noopener,noreferrer")}
            >
              {item.title ?? item.url}
            </MButton>
          ) : (
            <MText as="p" key={item.id}>
              {item.title ?? item.kind}
            </MText>
          ),
        )}
      </Section>
      <Section title="Activity">
        {activity.length === 0 ? (
          <MText as="p" mode="secondary">
            No activity recorded.
          </MText>
        ) : (
          activity.map((item) => (
            <MFlex justify="space-between" key={item.id}>
              <MText as="span">{item.eventType}</MText>
              <time dateTime={item.createdAt}>{item.createdAt.slice(0, 10)}</time>
            </MFlex>
          ))
        )}
      </Section>
    </>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }): ReactElement {
  return (
    <MFlex align="stretch" direction="column" gap="s">
      <MHeading mode="h4">{title}</MHeading>
      {children}
    </MFlex>
  );
}
function readError(error: unknown): string {
  return error instanceof Error ? error.message : "The task action could not be completed.";
}
