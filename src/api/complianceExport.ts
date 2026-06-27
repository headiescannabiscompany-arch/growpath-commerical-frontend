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
  collections: Record<string, unknown>;
};

export function getFacilityComplianceExport(facilityId: string) {
  return apiRequest<FacilityComplianceExport>(
    `/api/facility/${encodeURIComponent(facilityId)}/compliance/export`
  );
}
