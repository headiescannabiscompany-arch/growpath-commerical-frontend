import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFacilityTasks,
  createFacilityTask,
  updateFacilityTask
} from "../api/facilityTasks";
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

  const complete = useMutation({
    mutationFn: (id: string) =>
      updateFacilityTask(selectedFacilityId!, id, {
        status: "done",
        completed: true,
        completedAt: new Date().toISOString()
      } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilityTasks", selectedFacilityId] });
    },
    onError
  });

  return {
    ...query,
    createTask: create.mutateAsync,
    creating: create.isPending,
    completeTask: complete.mutateAsync,
    completing: complete.isPending
  };
}
