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
  const listRes = await apiRequest(endpoints.sopTemplates(facilityId));
  return listRes?.templates ?? listRes?.data ?? listRes ?? [];
}

export async function createSOPTemplate(
  facilityId: string,
  data: any
): Promise<SOPTemplate> {
  const createRes = await apiRequest(endpoints.sopTemplates(facilityId), {
    method: "POST",
    body: data
  });
  return createRes?.created ?? createRes?.template ?? createRes;
}

export async function updateSOPTemplate(
  facilityId: string,
  id: string,
  data: any
): Promise<SOPTemplate> {
  const updateRes = await apiRequest(endpoints.sopTemplate(facilityId, id), {
    method: "PUT",
    body: data
  });
  return updateRes?.updated ?? updateRes?.template ?? updateRes;
}

export async function deleteSOPTemplate(facilityId: string, id: string): Promise<any> {
  const deleteRes = await apiRequest(endpoints.sopTemplate(facilityId, id), {
    method: "DELETE"
  });
  return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
}
