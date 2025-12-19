import { client } from "./client";

export const startSubscription = async (type, token) => {
  return client.post("/subscribe/start", { type }, token);
};

export const cancelSubscription = async (token) => {
  return client.post("/subscribe/cancel", {}, token);
};

export const getSubscriptionStatus = async (token) => {
  return client.get("/api/subscribe/status", token);
};

if (typeof module !== "undefined") {
  module.exports = { startSubscription, cancelSubscription, getSubscriptionStatus };
}
