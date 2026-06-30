import { apiRequest } from "./apiRequest";
import type { AutomationPolicy } from "../types/automation";

// Aliases for backward compatibility (Phase 2.3)
export const fetchAutomations = listAutomationPolicies;
export const toggleAutomation = setAutomationPolicyEnabled;

function normalizePolicy(raw: any): AutomationPolicy {
  return {
    id: String(raw?.id || raw?._id || ""),
    facilityId: String(raw?.facilityId || ""),
    type: String(raw?.type || raw?.trigger?.eventType || ""),
    name: String(raw?.name || raw?.type || ""),
    description: String(raw?.description || ""),
    enabled: raw?.enabled === true,
    config: raw?.config && typeof raw.config === "object" ? raw.config : {},
    lastTriggeredAt: raw?.lastTriggeredAt || null,
    lastTriggeredByUserId: raw?.lastTriggeredByUserId || null,
    triggerCount: Number(raw?.triggerCount || 0),
    createdAt: String(raw?.createdAt || ""),
    updatedAt: String(raw?.updatedAt || "")
  };
}

function normalizePolicyList(res: any): AutomationPolicy[] {
  const list =
    res?.policies ||
    res?.automationPolicies ||
    res?.data?.policies ||
    res?.data?.automationPolicies ||
    res?.data ||
    res ||
    [];
  return Array.isArray(list)
    ? list.map(normalizePolicy).filter((policy) => policy.id)
    : [];
}

export async function listAutomationPolicies(facilityId: string) {
  const res = await apiRequest(`/api/facilities/${facilityId}/automation/policies`);
  return normalizePolicyList(res);
}

export async function setAutomationPolicyEnabled(
  facilityId: string,
  policyId: string,
  enabled: boolean
) {
  const res = await apiRequest(
    `/api/facilities/${facilityId}/automation/policies/${policyId}`,
    {
      method: "PATCH",
      body: { enabled }
    }
  );
  return normalizePolicy(res?.policy || res?.automationPolicy || res?.data || res);
}

export async function triggerAutomationPolicy(
  facilityId: string,
  policyId: string,
  reason?: string
) {
  const res = await apiRequest(
    `/api/facilities/${facilityId}/automation/policies/${policyId}/trigger`,
    {
      method: "POST",
      body: reason ? { reason } : {}
    }
  );
  return {
    policy: normalizePolicy(res?.policy || res?.automationPolicy || res?.data || res),
    deliveries: Array.isArray(res?.deliveries) ? res.deliveries : []
  };
}
