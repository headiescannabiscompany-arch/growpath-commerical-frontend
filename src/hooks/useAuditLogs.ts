import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAuditLogs, createAuditLog } from "../api/audit";
import type { AuditLog } from "../types/contracts";

export function useAuditLogs(facilityId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: logs = [],
    isLoading,
    isRefetching: isRefreshing,
    error,
    refetch
  } = useQuery<AuditLog[]>({
    queryKey: ["auditLogs", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      const res = await listAuditLogs(facilityId);
      // API returns {success, data} envelope
      return (res as any)?.data || [];
    },
    enabled: !!facilityId,
    refetchOnWindowFocus: false
  });

  const { mutateAsync: addLog, isPending: isAdding } = useMutation({
    mutationFn: ({ action, details }: { action: string; details: string }) => {
      if (!facilityId) throw new Error("No facility selected");
      return createAuditLog(facilityId, action, details); // details is optional in API signature
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
