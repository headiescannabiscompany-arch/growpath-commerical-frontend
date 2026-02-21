import { Insight } from "../types/insight";
import { apiRequest } from "./apiRequest";

// Run insight generation for a facility (manual trigger)
export async function runInsights(
  facilityId: string
): Promise<{ created: number; updated: number }> {
  const res = await apiRequest(`/facilities/${facilityId}/insights/run`, {
    method: "POST"
  });
  return res?.data ?? res;
}

export async function fetchInsights(facilityId: string): Promise<Insight[]> {
  const res = await apiRequest(`/facilities/${facilityId}/insights`);
  return res?.data ?? res;
}

export async function resolveInsight(
  facilityId: string,
  insightId: string
): Promise<void> {
  await apiRequest(`/facilities/${facilityId}/insights/${insightId}/resolve`, {
    method: "POST"
  });
}

export async function snoozeInsight(
  facilityId: string,
  insightId: string
): Promise<void> {
  await apiRequest(`/facilities/${facilityId}/insights/${insightId}/snooze`, {
    method: "POST"
  });
}
