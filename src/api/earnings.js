import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function getMyEarnings() {
  return apiRequest(apiRoutes.CREATOR.MINE);
}

export function getEarningsByCourse() {
  return apiRequest(apiRoutes.CREATOR.BY_COURSE);
}

export function requestPayout(payoutMethod = "stripe") {
  return apiRequest(apiRoutes.CREATOR.REQUEST_PAYOUT, {
    method: "POST",
    body: { payoutMethod }
  });
}

export function getPlatformEarnings() {
  return apiRequest(apiRoutes.CREATOR.PLATFORM_STATS);
}
