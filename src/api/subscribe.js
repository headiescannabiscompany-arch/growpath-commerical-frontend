import { client } from "./client.js";
import ROUTES from "./routes.js";

export const startSubscription = async (type, token) => {
  return client.post(ROUTES.SUBSCRIBE.START, { type }, token);
};

export const cancelSubscription = async (token) => {
  return client.post(ROUTES.SUBSCRIBE.CANCEL, {}, token);
};

export const getSubscriptionStatus = async (token) => {
  return client.get(ROUTES.SUBSCRIBE.STATUS, token);
};

if (typeof module !== "undefined") {
  module.exports = { startSubscription, cancelSubscription, getSubscriptionStatus };
}
