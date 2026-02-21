import { apiRequest } from "./apiRequest";
import type { ComplianceLog, ComplianceLogType } from "../types/compliance";

export function listComplianceLogs(
  facilityId: string,
  params?: { type?: ComplianceLogType }
) {
  return apiRequest<ComplianceLog[]>(`/api/facilities/${facilityId}/compliance/logs`, {
    params: params?.type ? { type: params.type } : undefined
  });
}

export function createComplianceLog(
  facilityId: string,
  body: { type: ComplianceLogType; title: string; notes?: string }
) {
  return apiRequest<ComplianceLog>(`/api/facilities/${facilityId}/compliance/logs`, {
    method: "POST",
    body
  });
}
