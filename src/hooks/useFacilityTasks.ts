import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFacilityTasks, createFacilityTask } from "../api/facilityTasks";
import { useEntitlements } from "../context/EntitlementsContext";
import { useApiGuards } from "../api/hooks";

export function useFacilityTasks() {
  const qc = useQueryClient();
  const { selectedFacilityId } = useEntitlements();
  const { onError } = useApiGuards();

  const query = useQuery({
    queryKey: ["facilityTasks", selectedFacilityId],
    queryFn: () => getFacilityTasks(selectedFacilityId!),
    enabled: !!selectedFacilityId,
    onError
  });

  const create = useMutation({
    mutationFn: (data: any) => createFacilityTask(selectedFacilityId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilityTasks", selectedFacilityId] });
    },
    onError
  });

  return {
    ...query,
    createTask: create.mutateAsync
  };
}
