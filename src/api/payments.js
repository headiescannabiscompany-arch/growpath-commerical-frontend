import { client as api } from "./client.js";
import ROUTES from "./routes.js";

export function createCheckout(courseId, successUrl, cancelUrl) {
  return api(ROUTES.PAYMENTS.CHECKOUT(courseId), {
    method: "POST",
    body: JSON.stringify({
      userId: global.user._id,
      successUrl,
      cancelUrl
    })
  });
}