import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEntitlements } from "@/entitlements";
import { useApiGuards } from "../api/hooks";
import {
  createAutomationPolicy,
  deleteAutomationPolicy,
  listAutomationPolicies,
  setAutomationPolicyEnabled,
  triggerAutomationPolicy,
  updateAutomationPolicy
} from "../api/automation";
import type { AutomationPolicyPayload } from "@/types/automation";
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
  const create = useMutation({
    mutationFn: (payload: AutomationPolicyPayload) =>
      createAutomationPolicy(selectedFacilityId!, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError
  });
  const update = useMutation({
    mutationFn: ({
      policyId,
      patch
    }: {
      policyId: string;
      patch: Partial<AutomationPolicyPayload>;
    }) => updateAutomationPolicy(selectedFacilityId!, policyId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError
  });
  const remove = useMutation({
    mutationFn: (policyId: string) =>
      deleteAutomationPolicy(selectedFacilityId!, policyId),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError
  });
  return {
    ...query,
    createPolicy: create.mutateAsync,
    updatePolicy: update.mutateAsync,
    deletePolicy: remove.mutateAsync,
    togglePolicy: toggle.mutateAsync,
    triggerPolicy: trigger.mutateAsync,
    creating: create.isPending,
    updating: update.isPending,
    deleting: remove.isPending,
    toggling: toggle.isPending,
    triggering: trigger.isPending
  };
}
