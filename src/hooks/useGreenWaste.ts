import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGreenWasteLogs, createGreenWasteLog } from "../api/greenWaste";

export function useGreenWaste(facilityId: string | null) {
  const queryClient = useQueryClient();

  const wasteQuery = useQuery({
    queryKey: ["greenWaste", facilityId],
    queryFn: () => (facilityId ? getGreenWasteLogs(facilityId) : Promise.resolve([])),
    enabled: !!facilityId,
    refetchOnWindowFocus: false
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      if (!facilityId) throw new Error("No facility selected");
      return createGreenWasteLog(facilityId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["greenWaste", facilityId] });
    }
  });

  return {
    events: wasteQuery.data ?? [],
    isLoading: wasteQuery.isLoading,
    isRefreshing: wasteQuery.isRefetching,
    error: wasteQuery.error,
    refetch: wasteQuery.refetch,
    addEvent: createMutation.mutateAsync,
    isAdding: createMutation.isPending
  };
}
