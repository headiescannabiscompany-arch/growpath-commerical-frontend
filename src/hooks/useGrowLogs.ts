import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFacility } from "../facility/FacilityProvider";
import { getGrowlogs, createGrowlog } from "../api/growlogs";

// CONTRACT: facility context comes from FacilityProvider only.
export function useGrowlogs(growId?: string) {
  const queryClient = useQueryClient();
  const { activeFacilityId } = useFacility();

  const growlogsQuery = useQuery({
    queryKey: ["growlogs", activeFacilityId, growId],
    queryFn: () => getGrowlogs(activeFacilityId!),
    enabled: !!activeFacilityId
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createGrowlog(activeFacilityId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["growlogs", activeFacilityId] });
    }
  });

  return {
    ...growlogsQuery,
    createGrowlog: createMutation.mutateAsync,
    creating: createMutation.isPending
  };
}

// Backward-compatible alias
export const useGrowLogs = useGrowlogs;
