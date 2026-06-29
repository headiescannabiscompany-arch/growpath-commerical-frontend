import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function getSubscription() {
  return apiRequest(apiRoutes.SUBSCRIBE.ME);
}

function currentOrigin() {
  const location = globalThis?.window?.location;
  return typeof location?.origin === "string" ? location.origin : "";
}

export function createCheckoutSession(options = {}) {
  const origin = currentOrigin();
  const body = {
    plan: options.plan || "pro",
    interval: options.interval || "monthly",
    ...(origin
      ? {
          successUrl: `${origin}/offers?subscription=success`,
          cancelUrl: `${origin}/offers?subscription=canceled`
        }
      : {})
  };

  return apiRequest(apiRoutes.SUBSCRIBE.CREATE_CHECKOUT_SESSION, {
    method: "POST",
    body
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
