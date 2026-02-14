// CONTRACT: facility context comes from FacilityProvider only.
// Do not derive facilityId from entitlements or other UI state.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFacility } from "../facility/FacilityProvider";
import { listGrows, createGrow } from "../api/grows";

export function useGrows() {
  const queryClient = useQueryClient();
  const { activeFacilityId } = useFacility();

  const facilityId = activeFacilityId ?? null;

  const growsQuery = useQuery({
    queryKey: ["grows", facilityId],
    queryFn: () => listGrows(facilityId as string),
    enabled: !!facilityId
  });

  const createGrowMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!facilityId) {
        const err: any = new Error("No facility selected");
        err.code = "NO_FACILITY_SELECTED";
        err.status = 400;
        throw err;
      }
      return createGrow(facilityId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grows", facilityId] });
    }
  });

  return {
    ...growsQuery,
    createGrow: createGrowMutation.mutateAsync,
    creating: createGrowMutation.isPending
  };
}
