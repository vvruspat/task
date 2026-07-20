import { Injectable, Logger } from "@nestjs/common";
import type { CreateWebAgentChatInput } from "../agent/agent.contracts.js";
import type { TaskComment } from "./comments.contracts.js";
import type { TaskCommentsStore } from "./comments.store.js";

export type TaskAgentMentionRequest = {
  comment: TaskComment;
  projectId: string;
  taskId: string;
  userId: string;
  workspaceId: string;
};

export type TaskCommentAgentMentionHandler = {
  handleMention(request: TaskAgentMentionRequest): Promise<void>;
};

const taskAgentMentionPattern = /(^|\s)@task(?=$|\s|[.,!?;:])/iu;

@Injectable()
export class CommentAgentMentionService implements TaskCommentAgentMentionHandler {
  private readonly logger = new Logger(CommentAgentMentionService.name);

  constructor(
    private readonly commentsStore: Pick<TaskCommentsStore, "createAgentReply" | "listForTask">,
    private readonly agentService: AgentRunInvoker,
    private readonly projectsService: ProjectContextReader,
    private readonly tasksService: TaskContextReader,
    private readonly workspacesService: WorkspaceMemberReader,
  ) {}

  async handleMention(request: TaskAgentMentionRequest): Promise<void> {
    try {
      const [comments, project, task, members] = await Promise.all([
        this.commentsStore.listForTask(
          request.workspaceId,
          request.projectId,
          request.taskId,
          request.userId,
        ),
        this.projectsService.getProject(request.workspaceId, request.projectId, request.userId),
        this.tasksService.getTask(
          request.workspaceId,
          request.projectId,
          request.taskId,
          request.userId,
        ),
        this.workspacesService.listMembers(request.workspaceId, request.userId),
      ]);
      if (comments === null) return;

      const rootCommentId = request.comment.parentCommentId ?? request.comment.id;
      const thread = comments.filter(
        (comment) => comment.id === rootCommentId || comment.parentCommentId === rootCommentId,
      );
      const memberNames = new Map(members.map((member) => [member.userId, member.displayName]));
      const prompt = formatTaskAgentPrompt({
        comments: thread,
        invokingCommentId: request.comment.id,
        memberNames,
        projectId: project.id,
        projectName: project.title,
        taskDescription: task.description,
        taskId: task.id,
        taskIdentifier: `${project.key}-${task.number}`,
        taskTitle: task.title,
        workspaceId: request.workspaceId,
      });
      const run = await this.agentService.createWebRun(request.workspaceId, request.userId, {
        messages: [{ content: prompt, role: "user" }],
        projectId: request.projectId,
      });
      await this.commentsStore.createAgentReply(
        request.workspaceId,
        request.projectId,
        request.taskId,
        request.userId,
        {
          agentRunId: run.agentRunId,
          body: run.responseText,
          parentCommentId: rootCommentId,
        },
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process @task mention for task ${request.taskId}.`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

type AgentRunInvoker = {
  createWebRun(
    workspaceId: string,
    userId: string,
    input: CreateWebAgentChatInput,
  ): Promise<{ agentRunId: string; responseText: string }>;
};

type ProjectContextReader = {
  getProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<{ id: string; key: string; title: string }>;
};

type TaskContextReader = {
  getTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<{ description: string | null; id: string; number: number; title: string }>;
};

type WorkspaceMemberReader = {
  listMembers(
    workspaceId: string,
    userId: string,
  ): Promise<Array<{ displayName: string; userId: string }>>;
};

export function mentionsTaskAgent(body: string): boolean {
  return taskAgentMentionPattern.test(body);
}

type TaskAgentPromptInput = {
  comments: TaskComment[];
  invokingCommentId: string;
  memberNames: ReadonlyMap<string, string>;
  projectId: string;
  projectName: string;
  taskDescription: string | null;
  taskId: string;
  taskIdentifier: string;
  taskTitle: string;
  workspaceId: string;
};

export function formatTaskAgentPrompt(input: TaskAgentPromptInput): string {
  const discussion = input.comments
    .map((comment) => {
      const author =
        comment.agentRunId === null
          ? (input.memberNames.get(comment.authorUserId) ?? comment.authorUserId)
          : "tAsk Agent";
      const marker = comment.id === input.invokingCommentId ? " [current request]" : "";
      return `- ${author}${marker}: ${comment.body}`;
    })
    .join("\n");

  return [
    "You were mentioned as @task inside a task discussion.",
    "Use the available tools when the current request asks you to change project or task data.",
    "Reply concisely with what you did or what information you need next.",
    "",
    "Task context:",
    `- Workspace ID: ${input.workspaceId}`,
    `- Project: ${input.projectName} (${input.projectId})`,
    `- Task: ${input.taskIdentifier} — ${input.taskTitle} (${input.taskId})`,
    `- Description: ${input.taskDescription ?? "No description"}`,
    "",
    "Discussion thread, oldest first:",
    discussion,
  ].join("\n");
}
