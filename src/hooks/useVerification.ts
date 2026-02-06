import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getVerifications,
  approveVerification,
  rejectVerification
} from "../api/verification";

export function useVerification(facilityId: string | null) {
  const queryClient = useQueryClient();

  const verificationQuery = useQuery({
    queryKey: ["verification", facilityId],
    queryFn: () => (facilityId ? getVerifications(facilityId) : Promise.resolve([])),
    enabled: !!facilityId,
    refetchOnWindowFocus: false
  });

  const approveMutation = useMutation({
    mutationFn: (recordId: string) => {
      if (!facilityId) throw new Error("No facility selected");
      return approveVerification(facilityId, recordId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification", facilityId] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (args: { recordId: string; reason?: string }) => {
      if (!facilityId) throw new Error("No facility selected");
      return rejectVerification(facilityId, args.recordId, args.reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification", facilityId] });
    }
  });

  return {
    records: verificationQuery.data ?? [],
    isLoading: verificationQuery.isLoading,
    isRefreshing: verificationQuery.isRefetching,
    error: verificationQuery.error,
    refetch: verificationQuery.refetch,

    approveRecord: approveMutation.mutateAsync,
    approving: approveMutation.isPending,

    rejectRecord: rejectMutation.mutateAsync,
    rejecting: rejectMutation.isPending
  };
}
