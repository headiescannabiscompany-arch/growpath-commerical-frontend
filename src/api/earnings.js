import { client as api } from "./client.js";
import ROUTES from "./routes.js";

export function getMyEarnings() {
  return api(ROUTES.CREATOR.MINE);
}

export function getEarningsByCourse() {
  return api(ROUTES.CREATOR.BY_COURSE);
}

export function requestPayout(payoutMethod = "stripe") {
  return api(ROUTES.CREATOR.REQUEST_PAYOUT, {
    method: "POST",
    body: JSON.stringify({ payoutMethod })
  });
}

export function getPlatformEarnings() {
  return api(ROUTES.CREATOR.PLATFORM_STATS);
}