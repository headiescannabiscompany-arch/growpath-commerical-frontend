import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listGrows, createGrow } from "../api/grows";

export function useGrows() {
  const queryClient = useQueryClient();

  const growsQuery = useQuery({
    queryKey: ["grows"],
    queryFn: () => listGrows()
  });

  const createGrowMutation = useMutation({
    mutationFn: (data: any) => createGrow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grows"] });
    }
  });

  return {
    ...growsQuery,
    createGrow: createGrowMutation.mutateAsync,
    creating: createGrowMutation.isPending
  };
}
