import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  AgentRunSource,
  AgentRunStatus,
} from "../persistence/types/core-persistence.types.js";
import type {
  DashboardActivity,
  DashboardAgentRun,
  DashboardConfirmation,
  DashboardOverview,
  DashboardProject,
  DashboardTaskCounts,
  ListMyTasksInput,
  MyTaskItem,
  MyTasksPage,
} from "./dashboard.contracts.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class DashboardProjectDto implements DashboardProject {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty() readonly title: string;
  @ApiProperty({ nullable: true, required: true, type: String }) readonly status: string | null;
  @ApiProperty({ format: "date-time" }) readonly updatedAt: Date;
  constructor(value: DashboardProject) {
    this.id = value.id;
    this.title = value.title;
    this.status = value.status;
    this.updatedAt = value.updatedAt;
  }
}
export class DashboardTaskCountsDto implements DashboardTaskCounts {
  @ApiProperty() readonly assigned: number;
  @ApiProperty() readonly overdue: number;
  @ApiProperty() readonly dueSoon: number;
  constructor(value: DashboardTaskCounts) {
    this.assigned = value.assigned;
    this.overdue = value.overdue;
    this.dueSoon = value.dueSoon;
  }
}
export class DashboardActivityDto implements DashboardActivity {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty() readonly eventType: string;
  @ApiProperty() readonly entityType: string;
  @ApiProperty({ format: "uuid" }) readonly entityId: string;
  @ApiProperty({ format: "uuid", nullable: true, required: true, type: String })
  readonly actorUserId: string | null;
  @ApiProperty({ format: "date-time" }) readonly createdAt: Date;
  constructor(value: DashboardActivity) {
    this.id = value.id;
    this.eventType = value.eventType;
    this.entityType = value.entityType;
    this.entityId = value.entityId;
    this.actorUserId = value.actorUserId;
    this.createdAt = value.createdAt;
  }
}
export class DashboardConfirmationDto implements DashboardConfirmation {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty({ format: "uuid" }) readonly agentRunId: string;
  @ApiProperty() readonly kind: string;
  @ApiProperty({ format: "date-time" }) readonly expiresAt: Date;
  @ApiProperty({ format: "date-time" }) readonly createdAt: Date;
  constructor(value: DashboardConfirmation) {
    this.id = value.id;
    this.agentRunId = value.agentRunId;
    this.kind = value.kind;
    this.expiresAt = value.expiresAt;
    this.createdAt = value.createdAt;
  }
}
export class DashboardAgentRunDto implements DashboardAgentRun {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty({ enum: ["telegram", "web", "mini_app"] }) readonly source: AgentRunSource;
  @ApiProperty({ enum: ["running", "waiting_confirmation", "completed", "failed"] })
  readonly status: AgentRunStatus;
  @ApiProperty() readonly inputText: string;
  @ApiProperty({ format: "date-time" }) readonly createdAt: Date;
  constructor(value: DashboardAgentRun) {
    this.id = value.id;
    this.source = value.source;
    this.status = value.status;
    this.inputText = value.inputText;
    this.createdAt = value.createdAt;
  }
}
export class DashboardOverviewDto implements DashboardOverview {
  @ApiProperty({ type: DashboardProjectDto, isArray: true })
  readonly activeProjects: DashboardProjectDto[];
  @ApiProperty({ type: DashboardTaskCountsDto }) readonly taskCounts: DashboardTaskCountsDto;
  @ApiProperty({ type: DashboardActivityDto, isArray: true })
  readonly recentActivity: DashboardActivityDto[];
  @ApiProperty({ type: DashboardConfirmationDto, isArray: true })
  readonly pendingConfirmations: DashboardConfirmationDto[];
  @ApiProperty({ type: DashboardAgentRunDto, isArray: true })
  readonly recentAgentRuns: DashboardAgentRunDto[];
  constructor(value: DashboardOverview) {
    this.activeProjects = value.activeProjects.map((item) => new DashboardProjectDto(item));
    this.taskCounts = new DashboardTaskCountsDto(value.taskCounts);
    this.recentActivity = value.recentActivity.map((item) => new DashboardActivityDto(item));
    this.pendingConfirmations = value.pendingConfirmations.map(
      (item) => new DashboardConfirmationDto(item),
    );
    this.recentAgentRuns = value.recentAgentRuns.map((item) => new DashboardAgentRunDto(item));
  }
}
export class MyTaskItemDto implements MyTaskItem {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty({ format: "uuid" }) readonly projectId: string;
  @ApiProperty() readonly projectTitle: string;
  @ApiProperty() readonly title: string;
  @ApiProperty({ format: "date-time", nullable: true, required: true, type: Date })
  readonly dueAt: Date | null;
  @ApiProperty({ format: "uuid", nullable: true, required: true, type: String }) readonly statusId:
    | string
    | null;
  @ApiProperty({ nullable: true, required: true, type: String }) readonly statusName: string | null;
  @ApiProperty({ nullable: true, required: true, type: String }) readonly statusColor:
    | string
    | null;
  @ApiProperty() readonly position: string;
  @ApiProperty({ format: "date-time" }) readonly updatedAt: Date;
  constructor(value: MyTaskItem) {
    this.id = value.id;
    this.projectId = value.projectId;
    this.projectTitle = value.projectTitle;
    this.title = value.title;
    this.dueAt = value.dueAt;
    this.statusId = value.statusId;
    this.statusName = value.statusName;
    this.statusColor = value.statusColor;
    this.position = value.position;
    this.updatedAt = value.updatedAt;
  }
}
export class MyTasksPageDto implements MyTasksPage {
  @ApiProperty({ type: MyTaskItemDto, isArray: true }) readonly items: MyTaskItemDto[];
  @ApiProperty({ minimum: 1 }) readonly page: number;
  @ApiProperty({ minimum: 1, maximum: 100 }) readonly pageSize: number;
  @ApiProperty({ minimum: 0 }) readonly total: number;
  constructor(value: MyTasksPage) {
    this.items = value.items.map((item) => new MyTaskItemDto(item));
    this.page = value.page;
    this.pageSize = value.pageSize;
    this.total = value.total;
  }
}
export class ListMyTasksQueryDto implements ListMyTasksInput {
  @ApiPropertyOptional({ enum: ["today", "upcoming", "overdue", "review"] }) readonly queue?:
    | "today"
    | "upcoming"
    | "overdue"
    | "review";
  @ApiPropertyOptional({ format: "uuid" }) readonly projectId?: string;
  @ApiPropertyOptional({ format: "uuid" }) readonly statusId?: string;
  @ApiPropertyOptional({ minimum: 1, default: 1 }) readonly page: number = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 }) readonly pageSize: number = 25;
}
export class ParseListMyTasksQueryPipe implements PipeTransform<unknown, ListMyTasksInput> {
  transform(value: unknown): ListMyTasksInput {
    if (!isUnknownRecord(value)) throw new BadRequestException("My tasks query must be an object.");
    const text = (key: string): string | undefined => {
      const raw = value[key];
      if (raw === undefined) return undefined;
      if (typeof raw !== "string" || raw.trim() === "")
        throw new BadRequestException(`${key} must be a non-empty string.`);
      return raw;
    };
    const queue = text("queue");
    if (
      queue !== undefined &&
      queue !== "today" &&
      queue !== "upcoming" &&
      queue !== "overdue" &&
      queue !== "review"
    )
      throw new BadRequestException("queue must be today, upcoming, overdue, or review.");
    const projectId = text("projectId");
    const statusId = text("statusId");
    if (projectId !== undefined && !uuidPattern.test(projectId))
      throw new BadRequestException("projectId must be a UUID.");
    if (statusId !== undefined && !uuidPattern.test(statusId))
      throw new BadRequestException("statusId must be a UUID.");
    const positive = (key: string, fallback: number, max: number): number => {
      const raw = text(key);
      if (raw === undefined) return fallback;
      if (!/^\d+$/.test(raw)) throw new BadRequestException(`${key} must be a positive integer.`);
      const parsed = Number(raw);
      if (parsed < 1 || parsed > max)
        throw new BadRequestException(`${key} must be between 1 and ${max}.`);
      return parsed;
    };
    const input: ListMyTasksInput = {
      page: positive("page", 1, Number.MAX_SAFE_INTEGER),
      pageSize: positive("pageSize", 25, 100),
    };
    if (queue !== undefined) input.queue = queue;
    if (projectId !== undefined) input.projectId = projectId;
    if (statusId !== undefined) input.statusId = statusId;
    return input;
  }
}
function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
