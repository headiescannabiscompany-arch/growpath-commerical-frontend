import { api } from "./client";
import type { FacilityReport } from "../types/report";

export function getFacilityReport(facilityId: string) {
  return api<FacilityReport>(`/api/facilities/${facilityId}/reports/summary`);
}
