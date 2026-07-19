import { apiRequest } from "./apiRequest";

export type FacilityAnalyticsOverview = Record<string, any>;

export async function fetchFacilityAnalyticsOverview(
  facilityId: string
): Promise<FacilityAnalyticsOverview> {
  return apiRequest(
    `/api/analytics/facility/overview?facilityId=${encodeURIComponent(facilityId)}`
  );
}
