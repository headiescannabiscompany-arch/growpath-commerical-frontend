import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFacility } from "../facility/FacilityProvider";
import { getTasks, createTask, updateTask, deleteTask } from "../api/tasks";

// CONTRACT: facility context comes from FacilityProvider only.
export function useTasks() {
  const queryClient = useQueryClient();
  const { activeFacilityId } = useFacility();

  const tasksQuery = useQuery({
    queryKey: ["tasks", activeFacilityId],
    queryFn: () => getTasks(activeFacilityId!),
    enabled: !!activeFacilityId
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => createTask(activeFacilityId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", activeFacilityId] });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: (args: { id: string; patch: any }) =>
      updateTask(activeFacilityId!, args.id, args.patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", activeFacilityId] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => deleteTask(activeFacilityId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", activeFacilityId] });
    }
  });

  return {
    ...tasksQuery,

    createTask: createTaskMutation.mutateAsync,
    creating: createTaskMutation.isPending,

    updateTask: updateTaskMutation.mutateAsync,
    updating: updateTaskMutation.isPending,

    deleteTask: deleteTaskMutation.mutateAsync,
    deleting: deleteTaskMutation.isPending
  };
}
