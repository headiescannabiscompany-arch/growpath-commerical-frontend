import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export async function getSubscriptionStatus() {
  const res = await apiRequest(endpoints.subscriptionStatus, { method: "GET" });
  return res?.data ?? res;
}
