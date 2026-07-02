import { Insight } from "../types/insight";
import { apiRequest } from "./apiRequest";
import { facilityPath } from "./endpoints";

export type FacilityInsightsSummary = {
  facilityId: string;
  activeGrowsCount: number;
  openTasksCount: number;
  overdueTasksCount: number;
  recentLogsCount: number;
  latestToolRuns: Array<Record<string, unknown>>;
  latestDiagnoses: Array<Record<string, unknown>>;
  activeAlerts: Array<Record<string, unknown>>;
  telemetryWarnings: Array<Record<string, unknown>>;
  generatedAt: string;
  scope: "existing-data-summary";
};

// Run insight generation for a facility (manual trigger)
export async function runInsights(
  facilityId: string
): Promise<{ created: number; updated: number }> {
  const runRes = await apiRequest(`/facilities/${facilityId}/insights/run`, {
    method: "POST"
  });
  return runRes?.data ?? runRes;
}

export async function fetchInsights(facilityId: string): Promise<Insight[]> {
  const fetchRes = await apiRequest(`/facilities/${facilityId}/insights`);
  return fetchRes?.data ?? fetchRes;
}

export async function fetchFacilityInsightsSummary(
  facilityId: string
): Promise<FacilityInsightsSummary> {
  return await apiRequest<FacilityInsightsSummary>(
    facilityPath(facilityId, "/insights/summary")
  );
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
