import { Insight } from "../types/insight";
import { api } from "./client";

// Run insight generation for a facility (manual trigger)
export async function runInsights(
  facilityId: string
): Promise<{ created: number; updated: number }> {
  const res = await api.post(`/facilities/${facilityId}/insights/run`);
  return res?.data ?? res;
}

export async function fetchInsights(facilityId: string): Promise<Insight[]> {
  const res = await api.get(`/facilities/${facilityId}/insights`);
  return res?.data ?? res;
}

export async function resolveInsight(
  facilityId: string,
  insightId: string
): Promise<void> {
  await api.post(`/facilities/${facilityId}/insights/${insightId}/resolve`);
}

export async function snoozeInsight(
  facilityId: string,
  insightId: string
): Promise<void> {
  await api.post(`/facilities/${facilityId}/insights/${insightId}/snooze`);
}
