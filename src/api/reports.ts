import { apiRequest } from "./apiRequest";
import type { FacilityReport } from "../types/report";

export function getFacilityReport(facilityId: string) {
  return apiRequest<FacilityReport | { data?: FacilityReport; report?: FacilityReport }>(
    `/api/facilities/${encodeURIComponent(facilityId)}/reports/summary`
  ).then((res: any) => res?.report ?? res?.data?.report ?? res?.data ?? res);
}
