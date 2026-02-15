import { client } from "./client.js";
import apiRoutes from "./routes.js";

export const startSubscription = async (type, token) => {
  return client.post(apiRoutes.SUBSCRIBE.START, { type }, token);
};

export const cancelSubscription = async (token) => {
  return client.post(apiRoutes.SUBSCRIBE.CANCEL, {}, token);
};

export const getSubscriptionStatus = async (token) => {
  return client.get(apiRoutes.SUBSCRIBE.STATUS, token);
};

if (typeof module !== "undefined") {
  module.exports = { startSubscription, cancelSubscription, getSubscriptionStatus };
}
