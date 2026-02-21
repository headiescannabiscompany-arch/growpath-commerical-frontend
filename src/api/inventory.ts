import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type InventoryItem = {
  id: string;
  name: string;
  qty?: number;
  quantity: number;
  unit?: string;
  createdAt?: string;
};

// CONTRACT: facility-scoped resources must use endpoints.ts and canonical envelopes.

export async function getInventory(facilityId: string): Promise<InventoryItem[]> {
  const res = await apiRequest(endpoints.inventory(facilityId));
  // Contract: { inventory: [...] }
  const items = res?.inventory ?? [];
  return items.map((i: any) => ({
    ...i,
    name: i.name ?? "Unnamed Item",
    quantity: i.quantity ?? i.qty ?? 0
  }));
}

export async function createInventoryItem(
  facilityId: string,
  data: any
): Promise<InventoryItem> {
  const res = await apiRequest(endpoints.inventory(facilityId), {
    method: "POST",
    body: data
  });
  return res?.created ?? res?.item ?? res;
}

export async function updateInventoryItem(
  facilityId: string,
  id: string,
  patch: any
): Promise<InventoryItem> {
  const res = await apiRequest(endpoints.inventoryItem(facilityId, id), {
    method: "PATCH",
    body: patch
  });
  return res?.updated ?? res?.item ?? res;
}

export async function deleteInventoryItem(facilityId: string, id: string) {
  const res = await apiRequest(endpoints.inventoryItem(facilityId, id), {
    method: "DELETE"
  });
  return res?.deleted ?? res?.ok ?? res;
}
