import { api } from "./client";
import { endpoints } from "./endpoints";

export async function getSubscriptionStatus() {
  const res = await api.get(endpoints.subscriptionStatus);
  return res?.data ?? res;
}
