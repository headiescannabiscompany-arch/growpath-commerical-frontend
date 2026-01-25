import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchGrowLogs, createGrowLog } from "../api/growlog";

export function useGrowLogs(growId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["growLogs", growId],
    queryFn: () => fetchGrowLogs(growId!),
    enabled: !!growId
  });

  const addLog = useMutation({
    mutationFn: (data: any) => createGrowLog(growId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["growLogs", growId] });
    }
  });

  return {
    ...query,
    addLog: addLog.mutateAsync,
    adding: addLog.isPending
  };
}
