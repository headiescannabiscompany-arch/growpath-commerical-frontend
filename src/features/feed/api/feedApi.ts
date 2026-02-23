// src/features/feed/api/feedApi.ts
import { api } from "../../../api/client";
import { endpoints } from "../../../api/endpoints";
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
  const commercialSearch = new URLSearchParams({
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

  return api.get(`${endpoints.feed}?${commercialSearch.toString()}`);
}

// ------------------------------
// The following exports are legacy-but-used in feed surfaces.
// Keep them here to avoid breaking imports, but route via endpoints.*
// ------------------------------

export async function getTasks(params: Record<string, any>) {
  const tasksSearch = new URLSearchParams(params as Record<string, string>);
  return api.get(`${endpoints.tasksGlobal}?${tasksSearch.toString()}`);
}

export async function patchTask(id: string, body: Record<string, any>) {
  return api.patch(endpoints.taskGlobal(id), body);
}

export async function getAlerts(params: Record<string, any>) {
  const alertsSearch = new URLSearchParams(params as Record<string, string>);
  return api.get(`${endpoints.alertsGlobal}?${alertsSearch.toString()}`);
}

export async function patchAlert(id: string, body: Record<string, any>) {
  return api.patch(endpoints.alertGlobal(id), body);
}

export async function getGrowLogs(params: Record<string, any>) {
  const growLogsSearch = new URLSearchParams(params as Record<string, string>);
  return api.get(`${endpoints.growlogLegacy}?${growLogsSearch.toString()}`);
}
