// src/api/sop.js
// API module for SOP templates
import client from "./client";

export async function listSOPTemplates(facilityId) {
  try {
    const res = await client.get(`/facilities/${facilityId}/sop-templates`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function createSOPTemplate(facilityId, data) {
  try {
    const res = await client.post(`/facilities/${facilityId}/sop-templates`, data);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function updateSOPTemplate(facilityId, sopId, data) {
  try {
    const res = await client.put(
      `/facilities/${facilityId}/sop-templates/${sopId}`,
      data
    );
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function deleteSOPTemplate(facilityId, sopId) {
  try {
    const res = await client.delete(`/facilities/${facilityId}/sop-templates/${sopId}`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
