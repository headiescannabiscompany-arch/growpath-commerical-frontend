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
  const res = await apiRequest(endpoints.vendors, {
    params: { facilityId }
  });
  return res?.vendors ?? res?.data ?? res ?? [];
}

export async function createVendor(facilityId: string, data: any): Promise<Vendor> {
  const res = await apiRequest(endpoints.vendors, {
    method: "POST",
    body: { facilityId, ...data }
  });
  return res?.created ?? res?.vendor ?? res;
}

export async function updateVendor(id: string, data: any): Promise<Vendor> {
  const res = await apiRequest(endpoints.vendor(id), {
    method: "PUT",
    body: data
  });
  return res?.updated ?? res?.vendor ?? res;
}

export async function deleteVendor(id: string) {
  const res = await apiRequest(endpoints.vendor(id), {
    method: "DELETE"
  });
  return res?.deleted ?? res?.ok ?? res;
}
