import { client as api } from "./client";

export function getSubscription() {
  return api("/api/subscription/me");
}

export function createCheckoutSession() {
  return api("/api/subscription/create-checkout-session", {
    method: "POST"
  });
}

export function mockUpgrade() {
  return api("/api/subscription/mock-upgrade", {
    method: "POST"
  });
}
