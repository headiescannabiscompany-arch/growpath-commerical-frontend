import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFacilityDetail, updateFacilityDetail } from "../api/facilitySettings";

export function useFacilitySettings(facilityId?: string) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["facilityDetail", facilityId],
    queryFn: () => (facilityId ? getFacilityDetail(facilityId) : null),
    enabled: !!facilityId,
    refetchOnWindowFocus: false
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => {
      if (!facilityId) throw new Error("No facility selected");
      return updateFacilityDetail(facilityId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilityDetail", facilityId] });
    }
  });

  return {
    facility: detailQuery.data,
    isLoading: detailQuery.isLoading,
    error: detailQuery.error,
    refetch: detailQuery.refetch,
    updateFacility: updateMutation.mutateAsync,
    updating: updateMutation.isPending
  };
}
