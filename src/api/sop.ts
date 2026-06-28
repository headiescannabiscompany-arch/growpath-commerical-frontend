import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type SOPTemplate = {
  id?: string;
  _id?: string;
  title?: string;
  content?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  version?: number;
  createdAt?: string;
};

function normalizeSOPList(value: any): SOPTemplate[] {
  const rows = value?.templates ?? value?.items ?? value?.sops ?? value?.data ?? value;
  return Array.isArray(rows) ? rows : [];
}

function normalizeSOP(value: any): SOPTemplate {
  return value?.created ?? value?.template ?? value?.sop ?? value?.item ?? value;
}

export async function getSOPTemplates(facilityId: string): Promise<SOPTemplate[]> {
  const listRes = await apiRequest(endpoints.sopTemplates(facilityId));
  return normalizeSOPList(listRes);
}

export async function createSOPTemplate(
  facilityId: string,
  data: any
): Promise<SOPTemplate> {
  const createRes = await apiRequest(endpoints.sopTemplates(facilityId), {
    method: "POST",
    body: data
  });
  return normalizeSOP(createRes);
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
  return normalizeSOP(updateRes?.updated ?? updateRes);
}

export async function deleteSOPTemplate(facilityId: string, id: string): Promise<any> {
  const deleteRes = await apiRequest(endpoints.sopTemplate(facilityId, id), {
    method: "DELETE"
  });
  return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
}
