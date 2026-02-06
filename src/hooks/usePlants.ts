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
