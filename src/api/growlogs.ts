import { api } from "./client";
import { endpoints } from "./endpoints";

export type Growlog = {
  id: string;
  title?: string;
  body?: string;
  createdAt?: string;
};

// CONTRACT: facility-scoped resources must use endpoints.ts and canonical envelopes.

export async function getGrowlogs(facilityId: string): Promise<Growlog[]> {
  const res = await api.get(endpoints.growlogs(facilityId));
  // Contract: { growlogs: [...] }
  return res?.growlogs ?? [];
}

export async function createGrowlog(facilityId: string, data: any): Promise<Growlog> {
  const res = await api.post(endpoints.growlogs(facilityId), data);
  return res?.created ?? res?.growlog ?? res;
}

export async function updateGrowlog(
  facilityId: string,
  id: string,
  patch: any
): Promise<Growlog> {
  const res = await api.patch(endpoints.growlog(facilityId, id), patch);
  return res?.updated ?? res?.growlog ?? res;
}

export async function deleteGrowlog(facilityId: string, id: string) {
  const res = await api.delete(endpoints.growlog(facilityId, id));
  return res?.deleted ?? res?.ok ?? res;
}
