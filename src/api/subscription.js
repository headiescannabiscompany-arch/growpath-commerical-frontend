import { client as api } from "./client.js";
import apiRoutes from "./routes.js";

export function getSubscription() {
  return api(apiRoutes.SUBSCRIBE.ME);
}

export function createCheckoutSession() {
  return api(apiRoutes.SUBSCRIBE.CREATE_CHECKOUT_SESSION, {
    method: "POST"
  });
}
