import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export {
  createConnectPayoutDashboardLink,
  getConnectPayoutStatus,
  startConnectPayoutOnboarding
} from "./stripeConnect";

export function getMyEarnings() {
  return apiRequest(apiRoutes.CREATOR.MINE);
}

export function getEarningsByCourse() {
  return apiRequest(apiRoutes.CREATOR.BY_COURSE);
}

export function getPlatformEarnings() {
  return apiRequest(apiRoutes.CREATOR.PLATFORM_STATS);
}
