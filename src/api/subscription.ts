import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";
import apiRoutes from "./routes.js";

export async function getSubscriptionStatus() {
  const res = await apiRequest(endpoints.subscriptionStatus, { method: "GET" });
  return res?.data ?? res;
}

export async function getSubscriptionSetupStatus() {
  const res = await apiRequest("/api/subscription/status", { method: "GET" });
  return res?.data ?? res;
}

export async function getSubscription() {
  const res = await apiRequest("/api/subscription/me", { method: "GET" });
  return res?.data ?? res;
}

function currentOrigin() {
  const location = (globalThis as any)?.window?.location;
  return typeof location?.origin === "string" ? location.origin : "";
}

export async function createCheckoutSession(
  data: {
    plan: string;
    interval?: string;
    billingInterval?: string;
    successUrl?: string;
    cancelUrl?: string;
    giftMode?: boolean;
    giftRecipientEmail?: string;
    giftRecipientName?: string;
    giftMessage?: string;
    giftTerm?: string;
  } = { plan: "pro", interval: "monthly" }
) {
  const origin = currentOrigin();
  const successUrl =
    data.successUrl || (origin ? `${origin}/offers?subscription=success` : "");
  const cancelUrl =
    data.cancelUrl || (origin ? `${origin}/offers?subscription=canceled` : "");
  const body = {
    plan: data.plan || "pro",
    interval: data.interval || data.billingInterval || "monthly",
    paymentMethodTypes: ["card"],
    disallowBankDebits: true,
    ...(successUrl ? { successUrl } : {}),
    ...(cancelUrl ? { cancelUrl } : {}),
    ...(data.giftMode ? { giftMode: true } : {}),
    ...(data.giftRecipientEmail
      ? { giftRecipientEmail: data.giftRecipientEmail.trim().toLowerCase() }
      : {}),
    ...(data.giftRecipientName
      ? { giftRecipientName: data.giftRecipientName.trim() }
      : {}),
    ...(data.giftMessage ? { giftMessage: data.giftMessage.trim() } : {}),
    ...(data.giftTerm ? { giftTerm: data.giftTerm } : {})
  };
  const res = await apiRequest("/api/subscription/create-checkout-session", {
    method: "POST",
    body
  });
  return res?.data ?? res;
}

export async function verifyIapReceipt({
  receipt,
  platform,
  productId,
  transactionId
}: {
  receipt: string;
  platform: string;
  productId?: string;
  transactionId?: string;
}) {
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
