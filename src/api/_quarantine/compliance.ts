import { api } from "./client";

export function fetchComplianceLogs(facilityId: string) {
  return api.get(`/facilities/${facilityId}/compliance/logs`);
}

export function createComplianceLog(facilityId: string, data: any) {
  return api.post(`/facilities/${facilityId}/compliance/logs`, data);
}
