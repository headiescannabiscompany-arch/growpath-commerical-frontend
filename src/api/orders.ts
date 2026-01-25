import { api } from "./client";

export type Order = {
  id: string;
  status: string;
  total?: number;
  currency?: string;
  createdAt?: string;
  customerName?: string;
};

export async function fetchOrders(): Promise<Order[]> {
  return api.get(`/commercial/orders`);
}
