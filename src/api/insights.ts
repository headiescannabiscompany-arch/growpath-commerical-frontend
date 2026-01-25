// Run insight generation for a facility (manual trigger)
export async function runInsights(
  facilityId: string
): Promise<{ created: number; updated: number }> {
  const { data } = await apiClient.post(`/facilities/${facilityId}/insights/run`);
  return data;
}
import { Insight } from "../types/insight";
import { apiClient } from "./client";

export async function fetchInsights(facilityId: string): Promise<Insight[]> {
  const { data } = await apiClient.get(`/facilities/${facilityId}/insights`);
  return data;
}

export async function resolveInsight(
  facilityId: string,
  insightId: string
): Promise<void> {
  await apiClient.post(`/facilities/${facilityId}/insights/${insightId}/resolve`);
}

export async function snoozeInsight(
  facilityId: string,
  insightId: string
): Promise<void> {
  await apiClient.post(`/facilities/${facilityId}/insights/${insightId}/snooze`);
}
