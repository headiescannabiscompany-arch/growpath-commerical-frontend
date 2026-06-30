import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEntitlements } from "@/entitlements";
import { useApiGuards } from "../api/hooks";
import {
  listAutomationPolicies,
  setAutomationPolicyEnabled,
  triggerAutomationPolicy
} from "../api/automation";
export function useAutomationPolicies() {
  const qc = useQueryClient();
  const { selectedFacilityId } = useEntitlements();
  const { onError } = useApiGuards();
  const queryKey = ["automationPolicies", selectedFacilityId];
  const query = useQuery({
    queryKey,
    queryFn: () => listAutomationPolicies(selectedFacilityId!),
    enabled: !!selectedFacilityId
  });
  useEffect(() => {
    if (query.error) onError?.(query.error);
  }, [query.error, onError]);
  const toggle = useMutation({
    mutationFn: ({ policyId, enabled }: { policyId: string; enabled: boolean }) =>
      setAutomationPolicyEnabled(selectedFacilityId!, policyId, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError
  });
  const trigger = useMutation({
    mutationFn: ({ policyId, reason }: { policyId: string; reason?: string }) =>
      triggerAutomationPolicy(selectedFacilityId!, policyId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError
  });
  return {
    ...query,
    togglePolicy: toggle.mutateAsync,
    triggerPolicy: trigger.mutateAsync,
    toggling: toggle.isPending,
    triggering: trigger.isPending
  };
}
