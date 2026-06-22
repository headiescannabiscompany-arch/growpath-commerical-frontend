import { apiRequest } from "./apiRequest";

const ORDERS_BASE = "/api/commercial/orders";

export type Order = {
  id: string;
  status: string;
  total?: number;
  currency?: string;
  createdAt?: string;
  customerName?: string;
};

export async function fetchOrders(): Promise<Order[]> {
  const res = await apiRequest(ORDERS_BASE);
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.orders)) return res.orders;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.orders)) return res.data.orders;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
}
