import { apiRequest } from "./apiRequest";
import type { AutomationPolicy } from "../types/automation";

// Aliases for backward compatibility (Phase 2.3)
export const fetchAutomations = listAutomationPolicies;
export const toggleAutomation = setAutomationPolicyEnabled;

export function listAutomationPolicies(facilityId: string) {
  return apiRequest<AutomationPolicy[]>(
    `/api/facilities/${facilityId}/automation/policies`
  );
}

export function setAutomationPolicyEnabled(
  facilityId: string,
  policyId: string,
  enabled: boolean
) {
  return apiRequest<AutomationPolicy>(
    `/api/facilities/${facilityId}/automation/policies/${policyId}`,
    {
      method: "PATCH",
      body: { enabled }
    }
  );
}
