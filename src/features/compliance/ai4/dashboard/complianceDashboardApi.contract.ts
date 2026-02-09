export type Severity = "LOW" | "MED" | "HIGH";

export type DeviationsSummaryResponse = {
  success: true;
  facilityId: string;
  recurringDeviations: Array<{
    code: string;
    label: string;
    count: number;
    lastSeenAt: string; // ISO
    severity: Severity;
  }>;
  openDeviations?: Array<{
    id: string;
    code: string;
    label: string;
    openedAt: string; // ISO
    severity: Severity;
  }>;
  generatedAt?: string; // ISO
  window?: string; // e.g. "4w"
};

export type SopsRecommendedResponse = {
  success: true;
  facilityId: string;
  recommendedSops: Array<{
    sopId: string;
    title: string;
    reason: string;
  }>;
  generatedAt?: string; // ISO
  window?: string;
};
