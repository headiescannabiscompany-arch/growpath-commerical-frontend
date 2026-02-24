// src/api/sop.js
// API module for SOP templates (legacy shim)
import { api } from "./client";
import { endpoints } from "./endpoints";

export async function listSOPTemplates(facilityId) {
  try {
    const listRes = await api.get(endpoints.sopTemplates(facilityId));
    return { success: true, data: listRes?.templates ?? listRes?.data ?? listRes };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to load SOPs" };
  }
}

export async function createSOPTemplate(facilityId, data) {
  try {
    const createRes = await api.post(endpoints.sopTemplates(facilityId), data);
    return {
      success: true,
      data: createRes?.created ?? createRes?.template ?? createRes
    };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to create SOP" };
  }
}

export async function updateSOPTemplate(facilityId, sopId, data) {
  try {
    const updateRes = await api.put(endpoints.sopTemplate(facilityId, sopId), data);
    return {
      success: true,
      data: updateRes?.updated ?? updateRes?.template ?? updateRes
    };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to update SOP" };
  }
}

export async function deleteSOPTemplate(facilityId, sopId) {
  try {
    const deleteRes = await api.delete(endpoints.sopTemplate(facilityId, sopId));
    return { success: true, data: deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to delete SOP" };
  }
}
