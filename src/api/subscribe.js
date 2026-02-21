import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export const startSubscription = async (type, token) => {
  return apiRequest(apiRoutes.SUBSCRIBE.START, {
    method: "POST",
    auth: token ? true : false,
    body: { type }
  });
};

export const cancelSubscription = async (token) => {
  return apiRequest(apiRoutes.SUBSCRIBE.CANCEL, {
    method: "POST",
    auth: token ? true : false,
    body: {}
  });
};

export const getSubscriptionStatus = async (token) => {
  return apiRequest(apiRoutes.SUBSCRIBE.STATUS, { auth: token ? true : false });
};

if (typeof module !== "undefined") {
  module.exports = { startSubscription, cancelSubscription, getSubscriptionStatus };
}
