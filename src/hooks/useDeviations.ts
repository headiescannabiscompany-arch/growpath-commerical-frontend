import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDeviations, createDeviation } from "../api/deviations";

export function useDeviations(facilityId: string | null) {
  const queryClient = useQueryClient();

  const deviationsQuery = useQuery({
    queryKey: ["deviations", facilityId],
    queryFn: () => (facilityId ? getDeviations(facilityId) : Promise.resolve([])),
    enabled: !!facilityId,
    refetchOnWindowFocus: false
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      if (!facilityId) throw new Error("No facility selected");
      return createDeviation(facilityId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deviations", facilityId] });
    }
  });

  return {
    deviations: deviationsQuery.data ?? [],
    isLoading: deviationsQuery.isLoading,
    isRefreshing: deviationsQuery.isRefetching,
    error: deviationsQuery.error,
    refetch: deviationsQuery.refetch,
    addDeviation: createMutation.mutateAsync,
    isAdding: createMutation.isPending
  };
}
