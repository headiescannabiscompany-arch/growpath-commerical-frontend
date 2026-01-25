import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTasks, createCustomTask, completeTask } from "../api/tasks";

export function usePersonalTasks() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["personalTasks"],
    queryFn: () => getTasks()
  });

  const createTask = useMutation({
    mutationFn: (data: any) => createCustomTask(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personalTasks"] });
    }
  });

  const complete = useMutation({
    mutationFn: (id: string) => completeTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personalTasks"] });
    }
  });

  return {
    ...query,
    createTask: createTask.mutateAsync,
    creating: createTask.isPending,
    complete: complete.mutateAsync,
    completing: complete.isPending
  };
}
