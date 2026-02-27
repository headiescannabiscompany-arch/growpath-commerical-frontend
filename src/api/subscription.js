import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function getSubscription() {
  return apiRequest(apiRoutes.SUBSCRIBE.ME);
}

export function createCheckoutSession() {
  return apiRequest(apiRoutes.SUBSCRIBE.CREATE_CHECKOUT_SESSION, {
    method: "POST"
  });
}

export function getSubscriptionStatus() {
  return apiRequest(apiRoutes.SUBSCRIBE.STATUS, { method: "GET" });
}
