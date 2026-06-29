import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export async function getSubscriptionStatus() {
  const res = await apiRequest(endpoints.subscriptionStatus, { method: "GET" });
  return res?.data ?? res;
}

export async function getSubscription() {
  const res = await apiRequest("/api/subscription/me", { method: "GET" });
  return res?.data ?? res;
}

export async function createCheckoutSession(
  data: {
    plan: string;
    interval?: string;
    billingInterval?: string;
  } = { plan: "pro", interval: "monthly" }
) {
  const body = {
    plan: data.plan || "pro",
    interval: data.interval || data.billingInterval || "monthly"
  };
  const res = await apiRequest("/api/subscription/create-checkout-session", {
    method: "POST",
    body
  });
  return res?.data ?? res;
}
