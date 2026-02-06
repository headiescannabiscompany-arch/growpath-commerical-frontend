import { api } from "./client";
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
  const res = await api.get(
    `${endpoints.vendors}?facilityId=${encodeURIComponent(facilityId)}`
  );
  return res?.vendors ?? res?.data ?? res ?? [];
}

export async function createVendor(facilityId: string, data: any): Promise<Vendor> {
  const res = await api.post(endpoints.vendors, {
    facilityId,
    ...data
  });
  return res?.created ?? res?.vendor ?? res;
}

export async function updateVendor(id: string, data: any): Promise<Vendor> {
  const res = await api.put(endpoints.vendor(id), data);
  return res?.updated ?? res?.vendor ?? res;
}

export async function deleteVendor(id: string) {
  const res = await api.delete(endpoints.vendor(id));
  return res?.deleted ?? res?.ok ?? res;
}
