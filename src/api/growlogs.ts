import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type Growlog = {
  id: string;
  title?: string;
  body?: string;
  note?: string;
  createdAt?: string;
};

// CONTRACT: facility-scoped resources must use endpoints.ts and canonical envelopes.

export async function getGrowlogs(facilityId: string): Promise<Growlog[]> {
  const res = await apiRequest(endpoints.growlogs(facilityId));
  // Contract: { growlogs: [...] }
  return res?.growlogs ?? [];
}

export async function createGrowlog(facilityId: string, data: any): Promise<Growlog> {
  const res = await apiRequest(endpoints.growlogs(facilityId), {
    method: "POST",
    body: data
  });
  return res?.created ?? res?.growlog ?? res;
}

export async function updateGrowlog(
  facilityId: string,
  id: string,
  patch: any
): Promise<Growlog> {
  const res = await apiRequest(endpoints.growlog(facilityId, id), {
    method: "PATCH",
    body: patch
  });
  return res?.updated ?? res?.growlog ?? res;
}

export async function deleteGrowlog(facilityId: string, id: string) {
  const res = await apiRequest(endpoints.growlog(facilityId, id), {
    method: "DELETE"
  });
  return res?.deleted ?? res?.ok ?? res;
}
