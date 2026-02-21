import { apiRequest } from "./apiRequest";
import type { FacilityReport } from "../types/report";

export function getFacilityReport(facilityId: string) {
  return apiRequest<FacilityReport>(`/api/facilities/${facilityId}/reports/summary`);
}
