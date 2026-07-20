import { Injectable, type MessageEvent } from "@nestjs/common";
import { interval, map, merge, type Observable, of, Subject } from "rxjs";
import type {
  PublishWorkspaceChangeInput,
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
      this.createEvent("changed", input.workspaceId, input.projectId, input.taskId),
    );
  }

  subscribe(workspaceId: string): Observable<MessageEvent> {
    const connected = of(this.toMessageEvent(this.createEvent("connected", workspaceId)));
    const changes = this.getSubject(workspaceId).pipe(map((event) => this.toMessageEvent(event)));
    const heartbeat = interval(heartbeatIntervalMs).pipe(
      map(() => this.toMessageEvent(this.createEvent("heartbeat", workspaceId))),
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

  private createEvent(
    kind: WorkspaceRealtimeEventKind,
    workspaceId: string,
    projectId: string | null | undefined = null,
    taskId: string | null | undefined = null,
  ): WorkspaceRealtimeEvent {
    this.sequence += 1;
    return {
      id: `${Date.now()}-${this.sequence}`,
      kind,
      workspaceId,
      projectId: projectId ?? null,
      taskId: taskId ?? null,
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
