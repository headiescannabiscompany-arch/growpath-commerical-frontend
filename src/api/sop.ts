import { apiRequest } from "./apiRequest";
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
  const res = await apiRequest(endpoints.sopTemplates(facilityId));
  return res?.templates ?? res?.data ?? res ?? [];
}

export async function createSOPTemplate(
  facilityId: string,
  data: any
): Promise<SOPTemplate> {
  const res = await apiRequest(endpoints.sopTemplates(facilityId), {
    method: "POST",
    body: data
  });
  return res?.created ?? res?.template ?? res;
}

export async function updateSOPTemplate(
  facilityId: string,
  id: string,
  data: any
): Promise<SOPTemplate> {
  const res = await apiRequest(endpoints.sopTemplate(facilityId, id), {
    method: "PUT",
    body: data
  });
  return res?.updated ?? res?.template ?? res;
}

export async function deleteSOPTemplate(facilityId: string, id: string): Promise<any> {
  const res = await apiRequest(endpoints.sopTemplate(facilityId, id), {
    method: "DELETE"
  });
  return res?.deleted ?? res?.ok ?? res;
}
