import { apiRequest } from "./apiRequest";

export type GrowLogEntry = {
  id: string;
  grow: string;
  note?: string;
  createdAt: string;
  // add other fields you store (photos, tags, etc.)
};

export async function fetchGrowLogs(growId: string): Promise<GrowLogEntry[]> {
  // Uses the backend contract: GET /api/growlog?grow=<growId>
  return apiRequest(`/growlog`, { params: { grow: growId } });
}

export async function createGrowLog(growId: string, data: Record<string, any>) {
  // POST /api/growlog with grow in body
  return apiRequest(`/growlog`, {
    method: "POST",
    body: { ...data, grow: growId }
  });
}
