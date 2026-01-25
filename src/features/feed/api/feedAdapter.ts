// src/features/feed/api/feedAdapter.ts
import { getTasks, getAlerts, getGrowLogs } from "./feedApi";
import type { FeedItem } from "../types/feed";

export async function fetchUnifiedFeed(params: {
  facilityId: string;
  types?: string;
  status?: string;
  assignedTo?: string;
  cursor?: string;
  limit?: number;
}) {
  // Fetch all in parallel
  const [tasksRes, alertsRes, logsRes] = await Promise.all([
    getTasks(params),
    getAlerts(params),
    getGrowLogs(params)
  ]);

  // Normalize
  const tasks: FeedItem[] = (tasksRes.items || []).map((t: any) => ({
    id: t.id,
    type: "task",
    title: t.title,
    body: t.body,
    facilityId: t.facilityId,
    growId: t.growId,
    plantId: t.plantId,
    roomId: t.roomId,
    status: t.status,
    assignedTo: t.assignedTo,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    dueAt: t.dueAt,
    actor: t.actor,
    meta: t.meta
  }));
  const alerts: FeedItem[] = (alertsRes.items || []).map((a: any) => ({
    id: a.id,
    type: "alert",
    title: a.title,
    body: a.body,
    facilityId: a.facilityId,
    status: a.status,
    severity: a.severity,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    actor: a.actor,
    meta: a.meta
  }));
  const logs: FeedItem[] = (logsRes.items || []).map((l: any) => ({
    id: l.id,
    type: "log",
    title: l.title || l.action,
    body: l.body,
    facilityId: l.facilityId,
    growId: l.growId,
    plantId: l.plantId,
    roomId: l.roomId,
    status: "info",
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    actor: l.actor,
    meta: l.meta
  }));

  // Merge and sort by createdAt desc
  const all: FeedItem[] = [...tasks, ...alerts, ...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Pagination: use nextCursor/hasMore if any endpoint has more
  const nextCursor = tasksRes.nextCursor || alertsRes.nextCursor || logsRes.nextCursor;
  const hasMore = tasksRes.hasMore || alertsRes.hasMore || logsRes.hasMore;

  return { items: all, nextCursor, hasMore };
}
