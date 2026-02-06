// CONTRACT: All facility-scoped resources must use endpoints.ts (no hardcoded paths)
// and must return canonical envelopes.
import { api } from "./client";
import { endpoints } from "./endpoints";

export type Grow = {
  id: string;
  name?: string;
  createdAt?: string;
  // Add fields as your backend defines them (keep optional to avoid UI breakage during migration)
};

export async function listGrows(facilityId: string): Promise<Grow[]> {
  const res = await api.get(endpoints.grows(facilityId));
  // Contract: { grows: [...] }
  return res?.grows ?? [];
}

export async function createGrow(facilityId: string, data: any): Promise<Grow> {
  const res = await api.post(endpoints.grows(facilityId), data);
  // Contract options: { created: grow } (preferred) or { grow } or raw object
  return res?.created ?? res?.grow ?? res;
}

export async function updateGrow(
  facilityId: string,
  id: string,
  patch: any
): Promise<Grow> {
  const res = await api.patch(endpoints.grow(facilityId, id), patch);
  return res?.updated ?? res?.grow ?? res;
}

export async function deleteGrow(facilityId: string, id: string) {
  const res = await api.delete(endpoints.grow(facilityId, id));
  return res?.deleted ?? res?.ok ?? res;
}
