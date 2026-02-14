import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFacility } from "../facility/FacilityProvider";
import { listAuditLogs, createAuditLog } from "../api/audit";
import type { AuditLog } from "../types/contracts";

/**
 * CONTRACT:
 * - Facility context must come from FacilityProvider (or an explicit facilityId override).
 * - Hook must be safe when facilityId is missing (query disabled, returns empty logs).
 * - Must tolerate backend response shapes:
 *    - { success, data: AuditLog[] }
 *    - { logs: AuditLog[] }
 *    - AuditLog[]
 */
function normalizeAuditLogs(res: any): AuditLog[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as AuditLog[];
  if (Array.isArray(res?.data)) return res.data as AuditLog[];
  if (Array.isArray(res?.logs)) return res.logs as AuditLog[];
  if (Array.isArray(res?.items)) return res.items as AuditLog[];
  return [];
}

export function useAuditLogs(facilityIdOverride?: string | null) {
  const queryClient = useQueryClient();
  const { activeFacilityId } = useFacility();

  const facilityId = (facilityIdOverride ?? activeFacilityId) || null;

  const auditQuery = useQuery<AuditLog[]>({
    queryKey: ["auditLogs", facilityId],
    enabled: !!facilityId,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!facilityId) return [];
      const res = await listAuditLogs(facilityId);
      return normalizeAuditLogs(res);
    }
  });

  const addMutation = useMutation({
    mutationFn: async (args: { action: string; details?: string }) => {
      if (!facilityId) throw new Error("No facility selected");
      const action = String(args?.action ?? "").trim();
      const details = args?.details ? String(args.details) : "";

      if (!action) throw new Error("Action is required");

      // API signature: (facilityId, action, details?)
      return createAuditLog(facilityId, action, details);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditLogs", facilityId] });
    }
  });

  // Back-compat return shape (what your current AuditLogScreen expects)
  const logs = Array.isArray(auditQuery.data) ? auditQuery.data : [];

  return {
    // preferred
    data: logs,

    // back-compat
    logs,

    isLoading: auditQuery.isLoading,
    isRefreshing: auditQuery.isFetching || auditQuery.isRefetching,

    error: auditQuery.error,
    refetch: auditQuery.refetch,

    addLog: addMutation.mutateAsync,
    isAdding: addMutation.isPending,

    // extra (sometimes handy)
    adding: addMutation.isPending
  };
}
