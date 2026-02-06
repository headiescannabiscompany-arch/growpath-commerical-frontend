import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFacilityBillingStatus,
  startFacilityCheckout,
  cancelFacilityPlan
} from "../api/billing";

export function useFacilityBilling(facilityId: string | null) {
  const queryClient = useQueryClient();

  const billingQuery = useQuery({
    queryKey: ["billing", facilityId],
    queryFn: () => (facilityId ? getFacilityBillingStatus(facilityId) : null),
    enabled: !!facilityId,
    refetchOnWindowFocus: false
  });

  const startCheckoutMutation = useMutation({
    mutationFn: () => {
      if (!facilityId) throw new Error("No facility selected");
      return startFacilityCheckout(facilityId);
    }
  });

  const cancelPlanMutation = useMutation({
    mutationFn: () => {
      if (!facilityId) throw new Error("No facility selected");
      return cancelFacilityPlan(facilityId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", facilityId] });
    }
  });

  return {
    billing: billingQuery.data,
    isLoading: billingQuery.isLoading,
    error: billingQuery.error,
    refetch: billingQuery.refetch,

    startCheckout: startCheckoutMutation.mutateAsync,
    isStartingCheckout: startCheckoutMutation.isPending,

    cancelPlan: cancelPlanMutation.mutateAsync,
    isCanceling: cancelPlanMutation.isPending
  };
}
