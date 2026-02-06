// CONTRACT: facility context comes from FacilityProvider only.
// Do not derive facilityId from entitlements or other UI state.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFacility } from "../facility/FacilityProvider";
import { listGrows, createGrow } from "../api/grows";

export function useGrows() {
  const queryClient = useQueryClient();
  const { activeFacilityId } = useFacility();

  const growsQuery = useQuery({
    queryKey: ["grows", activeFacilityId],
    queryFn: () => listGrows(activeFacilityId!),
    enabled: !!activeFacilityId
  });

  const createGrowMutation = useMutation({
    mutationFn: (data: any) => createGrow(activeFacilityId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grows", activeFacilityId] });
    }
  });

  return {
    ...growsQuery,
    createGrow: createGrowMutation.mutateAsync,
    creating: createGrowMutation.isPending
  };
}
