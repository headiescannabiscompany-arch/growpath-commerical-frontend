import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function getMyEarnings() {
  return apiRequest(apiRoutes.CREATOR.MINE);
}

export function getEarningsByCourse() {
  return apiRequest(apiRoutes.CREATOR.BY_COURSE);
}

export function getConnectPayoutStatus() {
  return apiRequest(apiRoutes.CREATOR.CONNECT_PAYOUT_STATUS);
}

export function createConnectPayoutDashboardLink() {
  return apiRequest(apiRoutes.CREATOR.CONNECT_PAYOUT_DASHBOARD, {
    method: "POST"
  });
}

export function getPlatformEarnings() {
  return apiRequest(apiRoutes.CREATOR.PLATFORM_STATS);
}
