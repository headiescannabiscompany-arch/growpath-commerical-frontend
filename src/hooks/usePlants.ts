import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlants, createPlant } from "../api/plants";

export function usePlants() {
  const queryClient = useQueryClient();

  const plantsQuery = useQuery({
    queryKey: ["plants"],
    queryFn: () => getPlants()
  });

  const createPlantMutation = useMutation({
    mutationFn: (data: any) => createPlant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants"] });
    }
  });

  return {
    ...plantsQuery,
    createPlant: createPlantMutation.mutateAsync,
    creating: createPlantMutation.isPending
  };
}
