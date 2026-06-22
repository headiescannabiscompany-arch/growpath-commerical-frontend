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

export function verifyIapReceipt({ receipt, platform, productId, transactionId }) {
  return apiRequest(apiRoutes.SUBSCRIBE.VERIFY_IAP, {
    method: "POST",
    body: {
      receipt,
      platform,
      productId,
      transactionId
    }
  });
}

export function getSubscriptionStatus() {
  return apiRequest(apiRoutes.SUBSCRIBE.STATUS, { method: "GET" });
}
