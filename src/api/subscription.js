import { client as api } from "./client.js";
import ROUTES from "./routes.js";

export function getSubscription() {
  return api(ROUTES.SUBSCRIBE.ME);
}

export function createCheckoutSession() {
  return api(ROUTES.SUBSCRIBE.CREATE_CHECKOUT_SESSION, {
    method: "POST"
  });
}