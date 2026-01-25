import { api } from "./client";

export type GrowLogEntry = {
  id: string;
  grow: string;
  note?: string;
  createdAt: string;
  // add other fields you store (photos, tags, etc.)
};

export async function fetchGrowLogs(growId: string): Promise<GrowLogEntry[]> {
  // Uses the backend contract: GET /api/growlog?grow=<growId>
  return api.get(`/growlog?grow=${encodeURIComponent(growId)}`);
}

export async function createGrowLog(growId: string, data: Record<string, any>) {
  // POST /api/growlog with grow in body
  return api.post(`/growlog`, { ...data, grow: growId });
}
