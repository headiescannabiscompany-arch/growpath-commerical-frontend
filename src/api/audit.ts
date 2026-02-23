import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";
import type { AuditLog } from "../types/contracts";

/**
 * CONTRACT:
 * - Facility-scoped path comes from endpoints.auditLogs(facilityId)
 * - No fetch drift: apiRequest only
 * - Tolerate backend response shapes:
 *    - { success, data: AuditLog[] }
 *    - { logs: AuditLog[] }
 *    - AuditLog[]
 * - Tolerate create signatures:
 *    - createAuditLog(facilityId, action, details?)
 *    - createAuditLog(facilityId, { action, details })
 */

function normalizeAuditLogs(res: any): AuditLog[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as AuditLog[];
  if (Array.isArray(res?.data)) return res.data as AuditLog[];
  if (Array.isArray(res?.logs)) return res.logs as AuditLog[];
  if (Array.isArray(res?.items)) return res.items as AuditLog[];
  return [];
}

function normalizeCreatedLog(res: any): AuditLog {
  if (!res) return res;
  if (res?.log) return res.log as AuditLog;
  if (res?.created) return res.created as AuditLog;
  if (res?.auditLog) return res.auditLog as AuditLog;
  if (res?.data && !Array.isArray(res.data)) return res.data as AuditLog;
  return res as AuditLog;
}

export async function listAuditLogs(
  facilityId: string
): Promise<{ success: boolean; data: AuditLog[] }> {
  const listRes = await apiRequest<any>(endpoints.auditLogs(facilityId), { method: "GET" });
  return { success: true, data: normalizeAuditLogs(listRes) };
}

// Overloads for TS callers + legacy callers
export async function createAuditLog(
  facilityId: string,
  action: string,
  details?: string
): Promise<{ success: boolean; log: AuditLog }>;
export async function createAuditLog(
  facilityId: string,
  data: { action: string; details?: string }
): Promise<{ success: boolean; log: AuditLog }>;
export async function createAuditLog(
  facilityId: string,
  a: any,
  b?: any
): Promise<{ success: boolean; log: AuditLog }> {
  const payload =
    typeof a === "string"
      ? { action: a, ...(b ? { details: String(b) } : {}) }
      : {
          action: String(a?.action ?? ""),
          ...(a?.details ? { details: String(a.details) } : {})
        };

  const createRes = await apiRequest<any>(endpoints.auditLogs(facilityId), {
    method: "POST",
    body: payload
  });

  return { success: true, log: normalizeCreatedLog(createRes) };
}

export async function reconcileAudit(facilityId: string, data: any) {
  return apiRequest<any>(`${endpoints.auditLogs(facilityId)}/reconcile`, {
    method: "POST",
    body: data
  });
}
