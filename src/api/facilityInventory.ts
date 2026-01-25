import { api } from "./client";

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
};

export function fetchInventory(facilityId: string) {
  return api.get(`/facilities/${facilityId}/inventory`);
}

export function createInventoryItem(facilityId: string, data: any) {
  return api.post(`/facilities/${facilityId}/inventory`, data);
}

export function updateInventoryItem(facilityId: string, itemId: string, data: any) {
  return api.patch(`/facilities/${facilityId}/inventory/${itemId}`, data);
}
