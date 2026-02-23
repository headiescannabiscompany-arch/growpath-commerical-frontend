import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type Deviation = {
  id?: string;
  _id?: string;
  description?: string;
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
