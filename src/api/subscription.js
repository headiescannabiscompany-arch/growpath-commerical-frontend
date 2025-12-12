import { api } from "./client";

export function getSubscription() {
  return api("/api/subscription/me");
}

export function mockUpgrade() {
  return api("/api/subscription/mock-upgrade", {
    method: "POST"
  });
}
