import { api } from "./client";
import type { AutomationPolicy } from "../types/automation";

export function listAutomationPolicies(facilityId: string) {
  return api<AutomationPolicy[]>(`/api/facilities/${facilityId}/automation/policies`);
}

export function setAutomationPolicyEnabled(
  facilityId: string,
  policyId: string,
  enabled: boolean
) {
  return api<AutomationPolicy>(
    `/api/facilities/${facilityId}/automation/policies/${policyId}`,
    {
      method: "PATCH",
      body: { enabled }
    }
  );
}
