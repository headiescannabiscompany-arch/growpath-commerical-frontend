// CONTRACT: facility context comes from FacilityProvider only.
// Do not derive facilityId from entitlements, auth, or user object.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFacility } from "../facility/FacilityProvider";
import { getPlants, createPlant } from "../api/plants";

export function usePlants() {
  const queryClient = useQueryClient();
  const { activeFacilityId } = useFacility();

  const facilityId = activeFacilityId ?? null;

  const plantsQuery = useQuery({
    queryKey: ["plants", facilityId],
    queryFn: () => getPlants(facilityId as string),
    enabled: !!facilityId
  });

  const createPlantMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!facilityId) {
        const err: any = new Error("No facility selected");
        err.code = "NO_FACILITY_SELECTED";
        err.status = 400;
        throw err;
      }
      return createPlant(facilityId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants", facilityId] });
    }
  });

  return {
    ...plantsQuery,
    createPlant: createPlantMutation.mutateAsync,
    creating: createPlantMutation.isPending
  };
}
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFacility } from "../facility/FacilityProvider";
import { getPlants, createPlant } from "../api/plants";

// CONTRACT: facility context comes from FacilityProvider only.
// Do not derive facilityId from entitlements, auth, or user object.
export function usePlants() {
  const queryClient = useQueryClient();
  const { activeFacilityId } = useFacility();

  const plantsQuery = useQuery({
    queryKey: ["plants", activeFacilityId],
    queryFn: () => getPlants(activeFacilityId!),
    enabled: !!activeFacilityId
  });

  const createPlantMutation = useMutation({
    mutationFn: (data: any) => createPlant(activeFacilityId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants", activeFacilityId] });
    }
  });

  return {
    ...plantsQuery,
    createPlant: createPlantMutation.mutateAsync,
    creating: createPlantMutation.isPending
  };
}
