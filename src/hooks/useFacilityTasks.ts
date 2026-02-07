import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFacilityTasks, createFacilityTask } from "../api/facilityTasks";
import { useEntitlements } from "@/entitlements";
import { useApiGuards } from "../api/hooks";

export function useFacilityTasks() {
  const qc = useQueryClient();
  const { selectedFacilityId } = useEntitlements();
  const { onError } = useApiGuards();

  const query = useQuery({
    queryKey: ["facilityTasks", selectedFacilityId],
    queryFn: () => getFacilityTasks(selectedFacilityId!),
    enabled: !!selectedFacilityId
  });

  useEffect(() => {
    if (query.error) onError?.(query.error);
  }, [query.error, onError]);

  const create = useMutation({
    mutationFn: (data: any) => createFacilityTask(selectedFacilityId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilityTasks", selectedFacilityId] });
    },
    onError
  });

  return {
    ...query,
    createTask: create.mutateAsync,
    creating: create.isPending,
    // Phase 2.3.3: Stub for completeTask (implements updateTask with completed flag)
    completeTask: async (id: string) => {
      console.warn("completeTask not yet implemented for task:", id);
    }
  };
}
