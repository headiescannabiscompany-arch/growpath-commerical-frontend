import { api } from "./client";
import { endpoints } from "./endpoints";
import type { AuditLog } from "../types/contracts";

/**
 * Audit Log API
 *
 * Phase 2.3.7: Created to resolve TS2554 in useAuditLogs
 */

export async function listAuditLogs(
  facilityId: string
): Promise<{ success: boolean; data: AuditLog[] }> {
  const res = await api.get(endpoints.auditLogs(facilityId));
  return res;
}

export async function createAuditLog(
  facilityId: string,
  action: string,
  details?: string
): Promise<{ success: boolean; log: AuditLog }> {
  const res = await api.post(endpoints.auditLogs(facilityId), { action, details });
  return res;
}
