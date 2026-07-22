import { Injectable, type MessageEvent } from "@nestjs/common";
import { interval, map, merge, type Observable, of, Subject } from "rxjs";
import type {
  PublishWorkspaceChangeInput,
  PublishWorkspaceMemberChangeInput,
  WorkspaceRealtimeEvent,
  WorkspaceRealtimeEventKind,
} from "./realtime.contracts.js";
import { WorkspaceRealtimeEventDto } from "./realtime.dto.js";

const heartbeatIntervalMs = 25_000;

@Injectable()
export class WorkspaceRealtimeService {
  private readonly workspaceSubjects = new Map<string, Subject<WorkspaceRealtimeEvent>>();
  private sequence = 0;

  publishChange(input: PublishWorkspaceChangeInput): void {
    this.getSubject(input.workspaceId).next(
      this.createEvent({
        kind: "changed",
        workspaceId: input.workspaceId,
        ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
        ...(input.taskId === undefined ? {} : { taskId: input.taskId }),
      }),
    );
  }

  publishMemberRoleChanged(input: PublishWorkspaceMemberChangeInput): void {
    this.getSubject(input.workspaceId).next(
      this.createEvent({ kind: "member_role_changed", ...input }),
    );
  }

  publishMemberRemoved(input: PublishWorkspaceMemberChangeInput): void {
    this.getSubject(input.workspaceId).next(this.createEvent({ kind: "member_removed", ...input }));
  }

  subscribe(workspaceId: string): Observable<MessageEvent> {
    const connected = of(this.toMessageEvent(this.createEvent({ kind: "connected", workspaceId })));
    const changes = this.getSubject(workspaceId).pipe(map((event) => this.toMessageEvent(event)));
    const heartbeat = interval(heartbeatIntervalMs).pipe(
      map(() => this.toMessageEvent(this.createEvent({ kind: "heartbeat", workspaceId }))),
    );
    return merge(connected, changes, heartbeat);
  }

  private getSubject(workspaceId: string): Subject<WorkspaceRealtimeEvent> {
    const existing = this.workspaceSubjects.get(workspaceId);
    if (existing !== undefined) return existing;
    const created = new Subject<WorkspaceRealtimeEvent>();
    this.workspaceSubjects.set(workspaceId, created);
    return created;
  }

  private createEvent(input: {
    kind: WorkspaceRealtimeEventKind;
    workspaceId: string;
    projectId?: string | null;
    taskId?: string | null;
    memberId?: string | null;
    memberUserId?: string | null;
    memberRole?: WorkspaceRealtimeEvent["memberRole"];
  }): WorkspaceRealtimeEvent {
    this.sequence += 1;
    return {
      id: `${Date.now()}-${this.sequence}`,
      kind: input.kind,
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      memberId: input.memberId ?? null,
      memberUserId: input.memberUserId ?? null,
      memberRole: input.memberRole ?? null,
      occurredAt: new Date(),
    };
  }

  private toMessageEvent(event: WorkspaceRealtimeEvent): MessageEvent {
    return {
      id: event.id,
      type: `workspace.${event.kind}`,
      data: new WorkspaceRealtimeEventDto(event),
    };
  }
}
