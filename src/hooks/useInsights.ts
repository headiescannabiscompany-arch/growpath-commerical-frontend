import { runInsights } from "../api/insights";
export function useRunInsights(facilityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runInsights(facilityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights", facilityId] });
    }
  });
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchInsights, resolveInsight, snoozeInsight } from "../api/insights";
import { Insight } from "../types/insight";

export function useInsights(facilityId: string) {
  return useQuery<Insight[]>({
    queryKey: ["insights", facilityId],
    queryFn: () => fetchInsights(facilityId),
    staleTime: 5 * 60 * 1000
  });
}

export function useResolveInsight(facilityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (insightId: string) => resolveInsight(facilityId, insightId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights", facilityId] });
    }
  });
}

export function useSnoozeInsight(facilityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (insightId: string) => snoozeInsight(facilityId, insightId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights", facilityId] });
    }
  });
}
