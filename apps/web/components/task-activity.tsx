"use client";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Text,
  TextArea,
} from "@radix-ui/themes";
import type { TaskActivityEvent, TaskComment, TaskSummary } from "@task/api-client";
import {
  ArrowUp,
  Bell,
  BellOff,
  Bot,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Paperclip,
  Pencil,
} from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import { isTaskSubscription } from "../lib/notifications";
import {
  formatActivityTime,
  formatTaskActivity,
  isTaskActivityEvent,
  isTaskComment,
} from "../lib/task-activity";
import { workspaceRealtimeEvent } from "../lib/use-workspace-data";
import type { WorkspaceBootstrap } from "../lib/workspace-contracts";
import type { WorkspaceRealtimeChange } from "../lib/workspace-realtime";

type WorkspaceMember = WorkspaceBootstrap["workspace"]["members"][number];
type MentionRange = { end: number; query: string; start: number };
type MentionCandidate = { kind: "agent" } | { kind: "member"; member: WorkspaceMember };

export function TaskActivity({
  data,
  task,
}: Readonly<{ data: WorkspaceBootstrap | null; task: TaskSummary }>): ReactNode {
  const { t } = useI18n();
  const [events, setEvents] = useState<TaskActivityEvent[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [comment, setComment] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activityUrl = taskActivityUrl(task, "activity");
  const commentsUrl = taskActivityUrl(task, "comments");
  const subscriptionUrl = taskSubscriptionUrl(task);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void loadTaskActivity(activityUrl, commentsUrl, t("activity.requestError"), controller.signal)
      .then((result) => {
        setEvents(result.events);
        setComments(result.comments);
        setHistoryExpanded(false);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : t("activity.loadError"));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [activityUrl, commentsUrl, t]);

  useEffect(() => {
    const controller = new AbortController();
    setSubscriptionLoading(true);
    void fetch(subscriptionUrl, { signal: controller.signal })
      .then(async (response): Promise<unknown> => response.json())
      .then((value) => {
        if (isTaskSubscription(value)) setSubscribed(value.subscribed);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error ? loadError.message : t("activity.subscriptionLoadError"),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setSubscriptionLoading(false);
      });
    return () => controller.abort();
  }, [subscriptionUrl, t]);

  useEffect(() => {
    const handleRealtimeChange = (event: Event): void => {
      if (!(event instanceof CustomEvent) || !isWorkspaceRealtimeChange(event.detail)) return;
      if (event.detail.taskId !== task.id) return;
      void loadTaskActivity(activityUrl, commentsUrl, t("activity.requestError"))
        .then((result) => {
          setEvents(result.events);
          setComments(result.comments);
        })
        .catch((loadError: unknown) => {
          setError(loadError instanceof Error ? loadError.message : t("activity.refreshError"));
        });
    };
    window.addEventListener(workspaceRealtimeEvent, handleRealtimeChange);
    return () => window.removeEventListener(workspaceRealtimeEvent, handleRealtimeChange);
  }, [activityUrl, commentsUrl, task.id, t]);

  const memberById = (userId: string) =>
    data?.workspace.members.find((member) => member.userId === userId);
  const history = events.filter((event) => event.eventType !== "comment.created");
  const visibleHistory = historyExpanded ? history : history.slice(0, 3);
  const rootComments = comments.filter((item) => item.parentCommentId === null);

  const submitComment = async (): Promise<void> => {
    const nextComment = comment.trim();
    if (nextComment.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(commentsUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: nextComment,
          mentionedUserIds,
          parentCommentId: replyingToId,
        }),
      });
      const value: unknown = await response.json();
      if (!response.ok || !isTaskComment(value))
        throw new Error(readResponseError(value, t("activity.requestError")));
      setComment("");
      setMentionedUserIds([]);
      setReplyingToId(null);
      const refreshed = await loadTaskActivity(
        activityUrl,
        commentsUrl,
        t("activity.requestError"),
      );
      setComments(refreshed.comments);
      setEvents(refreshed.events);
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : t("activity.commentError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="task-activity">
      <Flex className="task-activity-heading" align="center" justify="between">
        <Heading as="h2" size="4">
          {t("activity.history")}
        </Heading>
        <Button
          color="gray"
          disabled={subscriptionLoading}
          size="1"
          variant={subscribed ? "soft" : "outline"}
          onClick={() => {
            setSubscriptionLoading(true);
            void fetch(subscriptionUrl, { method: subscribed ? "DELETE" : "PUT" })
              .then(async (response): Promise<unknown> => response.json())
              .then((value) => {
                if (isTaskSubscription(value)) setSubscribed(value.subscribed);
              })
              .catch(() => setError(t("activity.subscriptionError")))
              .finally(() => setSubscriptionLoading(false));
          }}
        >
          {subscribed ? <BellOff size={14} /> : <Bell size={14} />}
          {subscribed ? t("activity.unsubscribe") : t("activity.subscribe")}
        </Button>
      </Flex>
      {loading && history.length === 0 && (
        <Text size="2" color="gray">
          {t("activity.loading")}
        </Text>
      )}
      {!loading && history.length === 0 && (
        <Text size="2" color="gray">
          {t("activity.empty")}
        </Text>
      )}
      <Flex className="task-activity-timeline" direction="column" gap="3">
        {visibleHistory.map((event) => (
          <ActivityRow
            data={data}
            event={event}
            key={event.id}
            member={event.actorUserId === null ? undefined : memberById(event.actorUserId)}
          />
        ))}
      </Flex>
      {history.length > 3 && (
        <Button
          className="task-activity-toggle"
          color="gray"
          size="1"
          variant="ghost"
          onClick={() => setHistoryExpanded((expanded) => !expanded)}
        >
          {historyExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {historyExpanded
            ? t("activity.hideHistory")
            : t("activity.showAll", { count: history.length })}
        </Button>
      )}
      <Box className="task-comments">
        <Heading as="h3" size="3">
          {t("activity.comments")}
        </Heading>
        <Flex direction="column" gap="3">
          {rootComments.map((item) => {
            const replies = comments.filter((reply) => reply.parentCommentId === item.id);
            const isReplying = replyingToId === item.id;
            return (
              <Box className="task-comment-thread" key={item.id}>
                <CommentCard
                  comment={item}
                  member={memberById(item.authorUserId)}
                  mentionedMembers={membersByIds(data, item.mentionedUserIds)}
                  onReply={() => {
                    setComment("");
                    setMentionedUserIds([]);
                    setReplyingToId(item.id);
                  }}
                />
                {replies.map((reply) => (
                  <Box className="task-comment-reply" key={reply.id}>
                    <CommentCard
                      comment={reply}
                      member={memberById(reply.authorUserId)}
                      mentionedMembers={membersByIds(data, reply.mentionedUserIds)}
                      onReply={undefined}
                    />
                  </Box>
                ))}
                {isReplying && (
                  <Box className="task-comment-reply">
                    <CommentComposer
                      autoFocus
                      comment={comment}
                      members={data?.workspace.members ?? []}
                      mentionedUserIds={mentionedUserIds}
                      placeholder={t("activity.replyPlaceholder", {
                        user:
                          memberById(item.authorUserId)?.displayName ?? t("activity.userDative"),
                      })}
                      submitting={submitting}
                      onCancel={() => {
                        setComment("");
                        setMentionedUserIds([]);
                        setReplyingToId(null);
                      }}
                      onChange={(value, mentions) => {
                        setComment(value);
                        setMentionedUserIds(mentions);
                      }}
                      onSubmit={submitComment}
                    />
                  </Box>
                )}
              </Box>
            );
          })}
        </Flex>
        {replyingToId === null && (
          <CommentComposer
            autoFocus={false}
            comment={comment}
            members={data?.workspace.members ?? []}
            mentionedUserIds={mentionedUserIds}
            placeholder={t("activity.commentPlaceholder")}
            submitting={submitting}
            onCancel={undefined}
            onChange={(value, mentions) => {
              setComment(value);
              setMentionedUserIds(mentions);
            }}
            onSubmit={submitComment}
          />
        )}
      </Box>
      {error !== null && (
        <Text size="1" color="red">
          {error}
        </Text>
      )}
    </Card>
  );
}

function isWorkspaceRealtimeChange(value: unknown): value is WorkspaceRealtimeChange {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "changed" &&
    "taskId" in value &&
    (value.taskId === null || typeof value.taskId === "string")
  );
}

function ActivityRow({
  data,
  event,
  member,
}: Readonly<{
  data: WorkspaceBootstrap | null;
  event: TaskActivityEvent;
  member: WorkspaceBootstrap["workspace"]["members"][number] | undefined;
}>): ReactNode {
  const { locale, t } = useI18n();
  const actorName =
    member?.displayName ?? (event.actorUserId === null ? t("notifications.system") : t("nav.user"));
  const description = formatTaskActivity(event, {
    locale,
    memberName: (userId) =>
      data?.workspace.members.find((item) => item.userId === userId)?.displayName ?? null,
    statusName: (statusId) => data?.statuses.find((status) => status.id === statusId)?.name ?? null,
    t,
  });
  return (
    <Flex className="task-activity-row" align="center" gap="3">
      <Box className="task-activity-icon">{activityIcon(event.eventType)}</Box>
      <Text size="2">
        <strong>{actorName}</strong> {description}
      </Text>
      <Time value={event.createdAt} />
    </Flex>
  );
}

function CommentCard({
  comment,
  member,
  mentionedMembers,
  onReply,
}: Readonly<{
  comment: TaskComment;
  member: WorkspaceMember | undefined;
  mentionedMembers: WorkspaceMember[];
  onReply: (() => void) | undefined;
}>): ReactNode {
  const { t } = useI18n();
  const isAgent = comment.agentRunId !== null;
  const name = isAgent ? "tAsk Agent" : (member?.displayName ?? t("nav.user"));
  return (
    <Box className="task-comment-card">
      <Flex align="center" gap="2">
        <Avatar
          fallback={isAgent ? <Bot size={14} /> : initials(name)}
          size="2"
          src={isAgent ? undefined : (member?.avatarUrl ?? undefined)}
        />
        <Text size="2" weight="bold">
          {name}
        </Text>
        {isAgent && <Badge variant="soft">{t("common.agent")}</Badge>}
        <Time value={comment.createdAt} />
      </Flex>
      <Text className="task-comment-body" size="3">
        {comment.body}
      </Text>
      {mentionedMembers.length > 0 && (
        <Flex className="task-comment-mentions" gap="1" wrap="wrap">
          {mentionedMembers.map((mentioned) => (
            <Badge key={mentioned.userId} variant="soft">
              @{mentioned.displayName}
            </Badge>
          ))}
        </Flex>
      )}
      {onReply !== undefined && (
        <Button color="gray" size="1" variant="ghost" onClick={onReply}>
          {t("activity.reply")}
        </Button>
      )}
    </Box>
  );
}

function CommentComposer({
  autoFocus,
  comment,
  members,
  mentionedUserIds,
  placeholder,
  submitting,
  onCancel,
  onChange,
  onSubmit,
}: Readonly<{
  autoFocus: boolean;
  comment: string;
  members: WorkspaceMember[];
  mentionedUserIds: string[];
  placeholder: string;
  submitting: boolean;
  onCancel: (() => void) | undefined;
  onChange: (value: string, mentionedUserIds: string[]) => void;
  onSubmit: () => Promise<void>;
}>): ReactNode {
  const { t } = useI18n();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionMenuId = useId();
  const [mentionRange, setMentionRange] = useState<MentionRange | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const matchingCandidates =
    mentionRange === null ? [] : filterMentionCandidates(members, mentionRange.query);
  const activeCandidate = matchingCandidates[activeMentionIndex];

  const selectMention = (candidate: MentionCandidate): void => {
    if (mentionRange === null) return;
    const mention = candidate.kind === "agent" ? "@task" : `@${candidate.member.displayName}`;
    const nextComment = `${comment.slice(0, mentionRange.start)}${mention} ${comment.slice(mentionRange.end)}`;
    const nextCaretPosition = mentionRange.start + mention.length + 1;
    const nextMentionedUserIds =
      candidate.kind === "agent"
        ? mentionedUserIds
        : [...new Set([...mentionedUserIds, candidate.member.userId])];
    onChange(nextComment, nextMentionedUserIds);
    setMentionRange(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCaretPosition, nextCaretPosition);
    });
  };

  return (
    <Box className="task-comment-composer">
      <Box className="task-comment-composer-input">
        <TextArea
          ref={inputRef}
          aria-label={t("activity.addComment")}
          aria-activedescendant={
            mentionRange !== null && activeCandidate !== undefined
              ? mentionCandidateId(mentionMenuId, activeCandidate)
              : undefined
          }
          aria-autocomplete="list"
          aria-controls={mentionRange === null ? undefined : mentionMenuId}
          aria-expanded={mentionRange !== null}
          autoFocus={autoFocus}
          disabled={submitting}
          placeholder={placeholder}
          resize="vertical"
          rows={3}
          value={comment}
          onChange={(event) => {
            const nextComment = event.target.value;
            const retainedMentions = mentionedUserIds.filter((userId) => {
              const member = members.find((item) => item.userId === userId);
              return member !== undefined && nextComment.includes(`@${member.displayName}`);
            });
            onChange(nextComment, retainedMentions);
            setMentionRange(findMentionRange(nextComment, event.target.selectionStart));
            setActiveMentionIndex(0);
          }}
          onKeyDown={(event) => {
            if (mentionRange !== null && event.key === "ArrowDown") {
              event.preventDefault();
              setActiveMentionIndex((current) =>
                matchingCandidates.length === 0 ? 0 : (current + 1) % matchingCandidates.length,
              );
              return;
            }
            if (mentionRange !== null && event.key === "ArrowUp") {
              event.preventDefault();
              setActiveMentionIndex((current) =>
                matchingCandidates.length === 0
                  ? 0
                  : (current - 1 + matchingCandidates.length) % matchingCandidates.length,
              );
              return;
            }
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              mentionRange !== null &&
              activeCandidate !== undefined
            ) {
              event.preventDefault();
              selectMention(activeCandidate);
              return;
            }
            if (event.key === "Escape" && mentionRange !== null) {
              event.preventDefault();
              setMentionRange(null);
              return;
            }
            handleComposerKeyDown(event, onSubmit);
          }}
        />
        {mentionRange !== null && (
          <Box
            aria-label={t("activity.mentionOptions")}
            className="task-mention-menu"
            id={mentionMenuId}
            role="listbox"
          >
            {matchingCandidates.length === 0 ? (
              <Text size="2" color="gray">
                {t("activity.noMembers")}
              </Text>
            ) : (
              matchingCandidates.map((candidate, index) => (
                <button
                  aria-selected={index === activeMentionIndex}
                  id={mentionCandidateId(mentionMenuId, candidate)}
                  key={candidate.kind === "agent" ? "agent-task" : candidate.member.userId}
                  role="option"
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectMention(candidate)}
                >
                  {candidate.kind === "agent" ? (
                    <Avatar fallback={<Bot size={12} />} size="1" />
                  ) : (
                    <Avatar
                      fallback={initials(candidate.member.displayName)}
                      size="1"
                      src={candidate.member.avatarUrl ?? undefined}
                    />
                  )}
                  <span>
                    {candidate.kind === "agent"
                      ? "tAsk Agent (@task)"
                      : candidate.member.displayName}
                  </span>
                </button>
              ))
            )}
          </Box>
        )}
        <Flex className="task-comment-composer-actions" align="center" gap="2">
          {onCancel !== undefined && (
            <Button color="gray" size="1" variant="ghost" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          )}
          <IconButton
            aria-label={t("activity.sendComment")}
            disabled={submitting || comment.trim().length === 0}
            radius="full"
            type="button"
            onClick={() => void onSubmit()}
          >
            <ArrowUp size={16} />
          </IconButton>
        </Flex>
      </Box>
      <Text className="task-comment-hint" size="1" color="gray">
        {t("activity.shortcut")}
      </Text>
    </Box>
  );
}

function Time({ value }: Readonly<{ value: string }>): ReactNode {
  const { locale } = useI18n();
  return (
    <Text asChild className="task-activity-time" size="2" color="gray">
      <time dateTime={value} title={formatFullDate(value, locale)}>
        {formatActivityTime(value, locale)}
      </time>
    </Text>
  );
}

function activityIcon(eventType: string): ReactNode {
  if (eventType === "attachment.created") return <Paperclip size={14} />;
  if (eventType === "task.due_date_updated") return <CalendarClock size={14} />;
  if (eventType === "task.updated") return <Pencil size={14} />;
  return <CircleDot size={14} />;
}

async function loadTaskActivity(
  activityUrl: string,
  commentsUrl: string,
  fallback: string,
  signal?: AbortSignal,
): Promise<{ comments: TaskComment[]; events: TaskActivityEvent[] }> {
  const requestInit: RequestInit = signal === undefined ? {} : { signal };
  const [activityResponse, commentsResponse] = await Promise.all([
    fetch(activityUrl, requestInit),
    fetch(commentsUrl, requestInit),
  ]);
  const activity: unknown = await activityResponse.json();
  const comments: unknown = await commentsResponse.json();
  if (!activityResponse.ok || !isArrayOf(activity, isTaskActivityEvent)) {
    throw new Error(readResponseError(activity, fallback));
  }
  if (!commentsResponse.ok || !isArrayOf(comments, isTaskComment)) {
    throw new Error(readResponseError(comments, fallback));
  }
  return { comments, events: activity };
}

function taskActivityUrl(task: TaskSummary, resource: "activity" | "comments"): string {
  const query = new URLSearchParams({
    projectId: task.projectId,
    taskUpdatedAt: task.updatedAt,
    workspaceId: task.workspaceId,
  });
  return `/api/workspace/tasks/${encodeURIComponent(task.id)}/${resource}?${query.toString()}`;
}

function taskSubscriptionUrl(task: TaskSummary): string {
  const query = new URLSearchParams({ projectId: task.projectId, workspaceId: task.workspaceId });
  return `/api/workspace/tasks/${encodeURIComponent(task.id)}/subscription?${query.toString()}`;
}

function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

function readResponseError(value: unknown, fallback: string): string {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

function formatFullDate(value: string, locale: "en" | "ru"): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(date);
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toLocaleUpperCase("ru") || "?"
  );
}

function membersByIds(data: WorkspaceBootstrap | null, userIds: string[]): WorkspaceMember[] {
  if (data === null) return [];
  const ids = new Set(userIds);
  return data.workspace.members.filter((member) => ids.has(member.userId));
}

function filterMentionCandidates(members: WorkspaceMember[], query: string): MentionCandidate[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ru");
  const memberCandidates = members
    .filter(
      (member) =>
        normalizedQuery.length === 0 ||
        member.displayName.toLocaleLowerCase("ru").includes(normalizedQuery),
    )
    .map((member): MentionCandidate => ({ kind: "member", member }));
  const agentMatches =
    normalizedQuery.length === 0 ||
    "task".includes(normalizedQuery) ||
    "task agent".includes(normalizedQuery) ||
    "агент".includes(normalizedQuery);
  const agentCandidates: MentionCandidate[] = agentMatches ? [{ kind: "agent" }] : [];
  return [...agentCandidates, ...memberCandidates].slice(0, 8);
}

function mentionCandidateId(menuId: string, candidate: MentionCandidate): string {
  const candidateId = candidate.kind === "agent" ? "agent-task" : candidate.member.userId;
  return `${menuId}-${candidateId}`;
}

function findMentionRange(value: string, caret: number | null): MentionRange | null {
  if (caret === null) return null;
  const beforeCaret = value.slice(0, caret);
  const start = beforeCaret.lastIndexOf("@");
  if (start < 0) return null;
  const preceding = start === 0 ? " " : beforeCaret[start - 1];
  const query = beforeCaret.slice(start + 1);
  if (
    preceding === undefined ||
    !/\s/.test(preceding) ||
    query.length > 50 ||
    /[\n@,;:!?()[\]{}]/.test(query)
  ) {
    return null;
  }
  return { end: caret, query, start };
}

function handleComposerKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
  submit: () => Promise<void>,
): void {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
  event.preventDefault();
  void submit();
}
