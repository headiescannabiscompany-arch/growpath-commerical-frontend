// src/api/sop.js
// API module for SOP templates (legacy shim)
import { api } from "./client";
import { endpoints } from "./endpoints";

export async function listSOPTemplates(facilityId) {
  try {
    const res = await api.get(endpoints.sopTemplates(facilityId));
    return { success: true, data: res?.templates ?? res?.data ?? res };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to load SOPs" };
  }
}

export async function createSOPTemplate(facilityId, data) {
  try {
    const res = await api.post(endpoints.sopTemplates(facilityId), data);
    return { success: true, data: res?.created ?? res?.template ?? res };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to create SOP" };
  }
}

export async function updateSOPTemplate(facilityId, sopId, data) {
  try {
    const res = await api.put(endpoints.sopTemplate(facilityId, sopId), data);
    return { success: true, data: res?.updated ?? res?.template ?? res };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to update SOP" };
  }
}

export async function deleteSOPTemplate(facilityId, sopId) {
  try {
    const res = await api.delete(endpoints.sopTemplate(facilityId, sopId));
    return { success: true, data: res?.deleted ?? res?.ok ?? res };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to delete SOP" };
  }
}
