import { api } from "./client";
import { endpoints } from "./endpoints";

export type SOPTemplate = {
  id?: string;
  _id?: string;
  title?: string;
  content?: string;
  version?: number;
  createdAt?: string;
};

export async function getSOPTemplates(facilityId: string): Promise<SOPTemplate[]> {
  const res = await api.get(endpoints.sopTemplates(facilityId));
  return res?.templates ?? res?.data ?? res ?? [];
}

export async function createSOPTemplate(
  facilityId: string,
  data: any
): Promise<SOPTemplate> {
  const res = await api.post(endpoints.sopTemplates(facilityId), data);
  return res?.created ?? res?.template ?? res;
}

export async function updateSOPTemplate(
  facilityId: string,
  id: string,
  data: any
): Promise<SOPTemplate> {
  const res = await api.put(endpoints.sopTemplate(facilityId, id), data);
  return res?.updated ?? res?.template ?? res;
}

export async function deleteSOPTemplate(facilityId: string, id: string): Promise<any> {
  const res = await api.delete(endpoints.sopTemplate(facilityId, id));
  return res?.deleted ?? res?.ok ?? res;
}
