import { client as api } from "./client.js";
import apiRoutes from "./routes.js";

export function createCheckout(courseId, successUrl, cancelUrl) {
  return api(apiRoutes.PAYMENTS.CHECKOUT(courseId), {
    method: "POST",
    body: JSON.stringify({
      userId: global.user._id,
      successUrl,
      cancelUrl
    })
  });
}
