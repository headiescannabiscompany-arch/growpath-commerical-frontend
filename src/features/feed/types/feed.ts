// src/features/feed/types/feed.ts

export type FeedItemType = "task" | "alert" | "log" | "event" | "compliance" | "note";

export type FeedItemStatus = "open" | "done" | "ack" | "closed" | "info" | "acknowledged";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  scope: {
    facilityId: string;
    orgId?: string;
    teamId?: string;
  };
  actor: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  entityLinks?: {
    plantId?: string;
    growId?: string;
    roomId?: string;
    batchId?: string;
    [key: string]: string | undefined;
  };
  status: FeedItemStatus;
  createdAt: string;
  dueAt?: string;
  metadata?: Record<string, any>; // type-specific payload
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor?: string;
  hasMore: boolean;
}
