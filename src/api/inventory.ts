import { api } from "./client";
import { endpoints } from "./endpoints";

export type InventoryItem = {
  id: string;
  name?: string;
  qty?: number;
  createdAt?: string;
};

// CONTRACT: facility-scoped resources must use endpoints.ts and canonical envelopes.

export async function getInventory(facilityId: string): Promise<InventoryItem[]> {
  const res = await api.get(endpoints.inventory(facilityId));
  // Contract: { inventory: [...] }
  return res?.inventory ?? [];
}

export async function createInventoryItem(
  facilityId: string,
  data: any
): Promise<InventoryItem> {
  const res = await api.post(endpoints.inventory(facilityId), data);
  return res?.created ?? res?.item ?? res;
}

export async function updateInventoryItem(
  facilityId: string,
  id: string,
  patch: any
): Promise<InventoryItem> {
  const res = await api.patch(endpoints.inventoryItem(facilityId, id), patch);
  return res?.updated ?? res?.item ?? res;
}

export async function deleteInventoryItem(facilityId: string, id: string) {
  const res = await api.delete(endpoints.inventoryItem(facilityId, id));
  return res?.deleted ?? res?.ok ?? res;
}
