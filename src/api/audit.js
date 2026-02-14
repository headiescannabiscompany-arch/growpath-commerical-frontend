// src/api/audit.js
// API module for audit logs and reconciliation
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
  const res = await apiRequest(endpoints.auditLogs(facilityId), { method: "GET" });
  return { success: true, data: normalizeAuditLogs(res) };
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

  const res = await apiRequest(endpoints.auditLogs(facilityId), {
    method: "POST",
    body: payload
  });

  return { success: true, log: normalizeCreatedLog(res) };
}

export async function reconcileAudit(facilityId, data) {
  return apiRequest(`${endpoints.auditLogs(facilityId)}/reconcile`, {
    method: "POST",
    body: data
  });
}

// The original functions have been replaced with new implementations that use apiRequest and endpoints.
import client from "./client";

export async function listAuditLogs(facilityId) {
  try {
    const res = await client.get(`/facilities/${facilityId}/audit-logs`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function createAuditLog(facilityId, data) {
  try {
    const res = await client.post(`/facilities/${facilityId}/audit-logs`, data);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function reconcileAudit(facilityId, data) {
  try {
    const res = await client.post(`/facilities/${facilityId}/audit-logs/reconcile`, data);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
