import { client as api } from "./client.js";
import apiRoutes from "./routes.js";

export function getMyEarnings() {
  return api(apiRoutes.CREATOR.MINE);
}

export function getEarningsByCourse() {
  return api(apiRoutes.CREATOR.BY_COURSE);
}

export function requestPayout(payoutMethod = "stripe") {
  return api(apiRoutes.CREATOR.REQUEST_PAYOUT, {
    method: "POST",
    body: JSON.stringify({ payoutMethod })
  });
}

export function getPlatformEarnings() {
  return api(apiRoutes.CREATOR.PLATFORM_STATS);
}
