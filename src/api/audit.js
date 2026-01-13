// src/api/audit.js
// API module for audit logs and reconciliation
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
