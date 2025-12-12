import { api } from "./client";
import * as Linking from "expo-linking";

export function createCheckout(courseId, successUrl, cancelUrl) {
  return api(`/payments/checkout/${courseId}`, {
    method: "POST",
    body: JSON.stringify({
      userId: global.user._id,
      successUrl,
      cancelUrl,
    }),
  });
}