import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAuditLogs, createAuditLog } from "../api/audit";

export function useAuditLogs(facilityId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: logs = [],
    isLoading,
    isRefetching: isRefreshing,
    error,
    refetch
  } = useQuery({
    queryKey: ["auditLogs", facilityId],
    queryFn: () => (facilityId ? listAuditLogs(facilityId) : Promise.resolve([])),
    enabled: !!facilityId,
    refetchOnWindowFocus: false
  });

  const { mutateAsync: addLog, isPending: isAdding } = useMutation({
    mutationFn: ({ action, details }: { action: string; details: string }) => {
      if (!facilityId) throw new Error("No facility selected");
      return createAuditLog(facilityId, action, details);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditLogs", facilityId] });
    }
  });

  return {
    logs,
    isLoading,
    isRefreshing,
    error,
    refetch,
    addLog,
    isAdding
  };
}
