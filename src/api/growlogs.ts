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
  const listRes = await apiRequest(endpoints.growlogs(facilityId));
  // Contract: { growlogs: [...] }
  return listRes?.growlogs ?? [];
}

export async function createGrowlog(facilityId: string, data: any): Promise<Growlog> {
  const createRes = await apiRequest(endpoints.growlogs(facilityId), {
    method: "POST",
    body: data
  });
  return createRes?.created ?? createRes?.growlog ?? createRes;
}

export async function updateGrowlog(
  facilityId: string,
  id: string,
  patch: any
): Promise<Growlog> {
  const updateRes = await apiRequest(endpoints.growlog(facilityId, id), {
    method: "PATCH",
    body: patch
  });
  return updateRes?.updated ?? updateRes?.growlog ?? updateRes;
}

export async function deleteGrowlog(facilityId: string, id: string) {
  const deleteRes = await apiRequest(endpoints.growlog(facilityId, id), {
    method: "DELETE"
  });
  return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
}
