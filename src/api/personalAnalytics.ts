import { apiRequest } from "./apiRequest";

export type PersonalAnalyticsOverview = {
  consistency?: { activeGrows?: number; recentlyLoggedGrows?: number; rate?: number };
  activity?: { journalEntries?: number; toolRuns?: number; runComparisons?: number };
  environmentHistory?: { sourceCount?: number; pointCount?: number };
  taskCompletion?: { total?: number; completed?: number; rate?: number };
};

export async function fetchPersonalAnalyticsOverview(): Promise<PersonalAnalyticsOverview> {
  const response = await apiRequest("/api/analytics/personal/overview");
  return response?.overview ?? response?.analytics ?? response?.data ?? response ?? {};
}
