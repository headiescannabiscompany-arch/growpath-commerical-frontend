import { apiRequest } from "./apiRequest";

export type FacilityComplianceExport = {
  success: boolean;
  exportType: "facility_compliance_packet";
  facilityId: string;
  generatedAt: string;
  requestedBy?: string | null;
  filters: {
    startDate?: string | null;
    endDate?: string | null;
    maxRowsPerCollection?: number;
  };
  counts: Record<string, number>;
  evidenceSummary?: {
    sopRuns?: {
      totalRuns: number;
      completedRuns: number;
      inProgressRuns: number;
      totalSteps: number;
      doneSteps: number;
      skippedSteps: number;
      pendingSteps: number;
      runsMissingSteps: number;
    };
    deviations?: {
      totalDeviations: number;
      openDeviations: number;
      resolvedDeviations: number;
      cancelledDeviations: number;
    };
  };
  collections: Record<string, unknown>;
};

export function getFacilityComplianceExport(facilityId: string) {
  return apiRequest<FacilityComplianceExport>(
    `/api/facility/${encodeURIComponent(facilityId)}/compliance/export`
  );
}
