import { api } from "../../../api/client";

export interface GetCommercialFeedParams {
  facilityId: string;
  cursor?: string;
  limit?: number;
  types?: string; // comma-separated
  status?: string; // comma-separated
  assignedTo?: string;
  from?: string;
  to?: string;
}
export async function getCommercialFeed(
  params: GetCommercialFeedParams
): Promise<FeedResponse> {
  // Contract: GET /api/feed?mode=commercial&facilityId=...&cursor=...&limit=...&types=...&status=...&assignedTo=...&from=...&to=...
  const search = new URLSearchParams({
    ...(params.to ? { to: params.to } : {})
  });
  return api.get(`/api/feed?${search.toString()}`);
}

export async function getTasks(params: Record<string, any>) {
  return api.get("/api/tasks", { params });
}

export async function patchTask(id: string, body: Record<string, any>) {
  return api.patch(`/api/tasks/${id}`, body);
}

export async function getAlerts(params: Record<string, any>) {
  return api.get("/api/alerts", { params });
}

export async function patchAlert(id: string, body: Record<string, any>) {
  return api.patch(`/api/alerts/${id}`, body);
}

export async function getGrowLogs(params: Record<string, any>) {
  return api.get("/api/growlog", { params });
}
// src/features/feed/api/feedApi.ts
import { api } from "../../../api/client";
import type { FeedResponse } from "../types/feed";

export interface GetCommercialFeedParams {
  facilityId: string;
  cursor?: string;
  limit?: number;
  types?: string; // comma-separated
  status?: string; // comma-separated
  assignedTo?: string;
  from?: string;
  to?: string;
}

export async function getCommercialFeed(
  params: GetCommercialFeedParams
): Promise<FeedResponse> {
  // Contract: GET /api/feed?mode=commercial&facilityId=...&cursor=...&limit=...&types=...&status=...&assignedTo=...&from=...&to=...
  const search = new URLSearchParams({
    mode: "commercial",
    facilityId: params.facilityId,
    ...(params.cursor ? { cursor: params.cursor } : {}),
    ...(params.limit ? { limit: String(params.limit) } : {}),
    ...(params.types ? { types: params.types } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.assignedTo ? { assignedTo: params.assignedTo } : {}),
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {})
  });
  return api.get(`/api/feed?${search.toString()}`);
}
