import { api } from "./client";
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
  const res = await api.get(endpoints.deviations(facilityId));
  return res?.deviations ?? res?.logs ?? res?.data ?? [];
}

export async function createDeviation(facilityId: string, data: any): Promise<Deviation> {
  const res = await api.post(endpoints.deviations(facilityId), data);
  return res?.created ?? res?.deviation ?? res;
}
