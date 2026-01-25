import { api } from "./client";
import type { ComplianceLog, ComplianceLogType } from "../types/compliance";

export function listComplianceLogs(
  facilityId: string,
  params?: { type?: ComplianceLogType }
) {
  const qs = params?.type ? `?type=${encodeURIComponent(params.type)}` : "";
  return api<ComplianceLog[]>(`/api/facilities/${facilityId}/compliance/logs${qs}`);
}

export function createComplianceLog(
  facilityId: string,
  body: { type: ComplianceLogType; title: string; notes?: string }
) {
  return api<ComplianceLog>(`/api/facilities/${facilityId}/compliance/logs`, {
    method: "POST",
    body
  });
}
