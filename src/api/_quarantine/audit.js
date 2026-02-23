// src/api/audit.js
// API module for audit logs and reconciliation (canonical: apiRequest + endpoints)

import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

function normalizeAuditLogs(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.logs)) return res.logs;
  if (Array.isArray(res.items)) return res.items;
  return [];
}

function normalizeCreatedLog(res) {
  if (!res) return res;
  if (res.log) return res.log;
  if (res.created) return res.created;
  if (res.auditLog) return res.auditLog;
  if (res.data && !Array.isArray(res.data)) return res.data;
  return res;
}

export async function listAuditLogs(facilityId) {
  const listRes = await apiRequest(endpoints.auditLogs(facilityId), { method: "GET" });
  return { success: true, data: normalizeAuditLogs(listRes) };
}

// Supports BOTH:
// - createAuditLog(facilityId, action, details?)
// - createAuditLog(facilityId, { action, details })
export async function createAuditLog(facilityId, a, b) {
  const payload =
    typeof a === "string"
      ? { action: a, ...(b ? { details: String(b) } : {}) }
      : {
          action: String(a?.action ?? ""),
          ...(a?.details ? { details: String(a.details) } : {})
        };

  const createRes = await apiRequest(endpoints.auditLogs(facilityId), {
    method: "POST",
    body: payload
  });

  return { success: true, log: normalizeCreatedLog(createRes) };
}

export async function reconcileAudit(facilityId, data) {
  const reconcileRes = await apiRequest(`${endpoints.auditLogs(facilityId)}/reconcile`, {
    method: "POST",
    body: data
  });

  return { success: true, data: reconcileRes };
}
