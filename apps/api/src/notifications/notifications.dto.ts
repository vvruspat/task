import { ApiProperty } from "@nestjs/swagger";
import type {
  NotificationFeed,
  NotificationItem,
  NotificationKind,
  TaskSubscription,
} from "./notifications.contracts.js";

export class NotificationItemDto implements NotificationItem {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty({ enum: ["mention", "task_changed"] }) readonly kind: NotificationKind;
  @ApiProperty({ format: "uuid" }) readonly workspaceId: string;
  @ApiProperty({ format: "uuid" }) readonly taskId: string;
  @ApiProperty({ format: "uuid" }) readonly projectId: string;
  @ApiProperty() readonly projectKey: string;
  @ApiProperty() readonly taskNumber: number;
  @ApiProperty() readonly taskTitle: string;
  @ApiProperty({ format: "uuid", nullable: true, type: String }) readonly actorUserId:
    | string
    | null;
  @ApiProperty({ nullable: true, type: String }) readonly actorDisplayName: string | null;
  @ApiProperty() readonly eventType: string;
  @ApiProperty({ additionalProperties: true, type: "object" }) readonly payload: Record<
    string,
    unknown
  >;
  @ApiProperty({ format: "date-time" }) readonly createdAt: Date;
  @ApiProperty() readonly read: boolean;

  constructor(value: NotificationItem) {
    this.id = value.id;
    this.kind = value.kind;
    this.workspaceId = value.workspaceId;
    this.taskId = value.taskId;
    this.projectId = value.projectId;
    this.projectKey = value.projectKey;
    this.taskNumber = value.taskNumber;
    this.taskTitle = value.taskTitle;
    this.actorUserId = value.actorUserId;
    this.actorDisplayName = value.actorDisplayName;
    this.eventType = value.eventType;
    this.payload = value.payload;
    this.createdAt = value.createdAt;
    this.read = value.read;
  }
}

export class NotificationFeedDto implements NotificationFeed {
  @ApiProperty({ isArray: true, type: NotificationItemDto }) readonly items: NotificationItemDto[];
  @ApiProperty() readonly unreadCount: number;
  @ApiProperty({ format: "date-time", nullable: true, type: String })
  readonly lastReadAt: Date | null;

  constructor(value: NotificationFeed) {
    this.items = value.items.map((item) => new NotificationItemDto(item));
    this.unreadCount = value.unreadCount;
    this.lastReadAt = value.lastReadAt;
  }
}

export class TaskSubscriptionDto implements TaskSubscription {
  @ApiProperty() readonly subscribed: boolean;

  constructor(subscribed: boolean) {
    this.subscribed = subscribed;
  }
}
