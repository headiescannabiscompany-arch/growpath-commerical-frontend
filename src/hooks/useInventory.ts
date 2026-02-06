import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFacility } from "../facility/FacilityProvider";
import { getInventory, createInventoryItem } from "../api/inventory";

// CONTRACT: facility context comes from FacilityProvider only.
export function useInventory() {
  const queryClient = useQueryClient();
  const { activeFacilityId } = useFacility();

  const inventoryQuery = useQuery({
    queryKey: ["inventory", activeFacilityId],
    queryFn: () => getInventory(activeFacilityId!),
    enabled: !!activeFacilityId
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createInventoryItem(activeFacilityId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", activeFacilityId] });
    }
  });

  return {
    ...inventoryQuery,
    createInventoryItem: createMutation.mutateAsync,
    creating: createMutation.isPending
  };
}
