// src/api/deviation.js
// API module for deviation reports
import client from "./client";

export async function listDeviations(facilityId) {
  try {
    const res = await client.get(`/facilities/${facilityId}/deviations`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function createDeviation(facilityId, data) {
  try {
    const res = await client.post(`/facilities/${facilityId}/deviations`, data);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
