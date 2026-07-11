import { apiRequest } from "./apiRequest";
import routes from "./routes.js";

export type GrowLogEntry = {
  id: string;
  grow: string;
  note?: string;
  createdAt: string;
  // add other fields you store (photos, tags, etc.)
};

export function getEntries(filters?: Record<string, any>) {
  return apiRequest(routes.GROWLOG.LIST, { params: filters });
}

export function getEntry(id: string) {
  return apiRequest(routes.GROWLOG.DETAIL(id));
}

export function createEntry(data: Record<string, any>) {
  return apiRequest(routes.GROWLOG.CREATE, {
    method: "POST",
    body: data
  });
}

export function updateEntry(id: string, data: Record<string, any>) {
  return apiRequest(routes.GROWLOG.DETAIL(id), {
    method: "PUT",
    body: data
  });
}

export function deleteEntry(id: string) {
  return apiRequest(routes.GROWLOG.DETAIL(id), { method: "DELETE" });
}

export function autoTagEntry(id: string) {
  return apiRequest(routes.GROWLOG.AUTO_TAG(id), {
    method: "POST"
  });
}

export function getPlants() {
  return apiRequest(routes.PLANTS.LIST);
}

export async function fetchGrowLogs(growId: string): Promise<GrowLogEntry[]> {
  return getEntries({ grow: growId }) as Promise<GrowLogEntry[]>;
}

export async function createGrowLog(growId: string, data: Record<string, any>) {
  return createEntry({ ...data, grow: growId });
}
