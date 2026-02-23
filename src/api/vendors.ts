import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type Vendor = {
  id?: string;
  _id?: string;
  name?: string;
  contact?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export async function getVendors(facilityId: string): Promise<Vendor[]> {
  const listRes = await apiRequest(endpoints.vendors, {
    params: { facilityId }
  });
  return listRes?.vendors ?? listRes?.data ?? listRes ?? [];
}

export async function createVendor(facilityId: string, data: any): Promise<Vendor> {
  const createRes = await apiRequest(endpoints.vendors, {
    method: "POST",
    body: { facilityId, ...data }
  });
  return createRes?.created ?? createRes?.vendor ?? createRes;
}

export async function updateVendor(id: string, data: any): Promise<Vendor> {
  const updateRes = await apiRequest(endpoints.vendor(id), {
    method: "PUT",
    body: data
  });
  return updateRes?.updated ?? updateRes?.vendor ?? updateRes;
}

export async function deleteVendor(id: string) {
  const deleteRes = await apiRequest(endpoints.vendor(id), {
    method: "DELETE"
  });
  return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
}
