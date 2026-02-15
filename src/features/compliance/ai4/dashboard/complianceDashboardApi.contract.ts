export type Severity = "LOW" | "MED" | "HIGH";

export type DeviationsSummaryResponse = {
  success: true;
  facilityId: string;
  recurringDeviations: {
    code: string;
    label: string;
    count: number;
    lastSeenAt: string; // ISO
    severity: Severity;
  }[];
  openDeviations?: {
    id: string;
    code: string;
    label: string;
    openedAt: string; // ISO
    severity: Severity;
  }[];
  generatedAt?: string; // ISO
  window?: string; // e.g. "4w"
};

export type SopsRecommendedResponse = {
  success: true;
  facilityId: string;
  recommendedSops: {
    sopId: string;
    title: string;
    reason: string;
  }[];
  generatedAt?: string; // ISO
  window?: string;
};
