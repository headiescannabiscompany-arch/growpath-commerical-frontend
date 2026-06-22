import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type Deviation = {
  id?: string;
  _id?: string;
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  assignedTo?: string;
  createdAt?: string;
  resolvedAt?: string;
};

export async function getDeviations(facilityId: string): Promise<Deviation[]> {
  const listRes = await apiRequest(endpoints.deviations(facilityId));
  return listRes?.deviations ?? listRes?.logs ?? listRes?.data ?? [];
}

export async function createDeviation(facilityId: string, data: any): Promise<Deviation> {
  const createRes = await apiRequest(endpoints.deviations(facilityId), {
    method: "POST",
    body: data
  });
  return createRes?.created ?? createRes?.deviation ?? createRes;
}

export async function resolveDeviation(
  facilityId: string,
  id: string,
  data: { resolution?: string } = {}
): Promise<Deviation> {
  const resolveRes = await apiRequest(`${endpoints.deviation(facilityId, id)}/resolve`, {
    method: "PUT",
    body: { status: "resolved", ...data }
  });
  return resolveRes?.updated ?? resolveRes?.deviation ?? resolveRes;
}
