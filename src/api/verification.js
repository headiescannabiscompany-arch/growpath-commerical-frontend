// src/api/verification.js
// API module for task verification
import client from "./client";

export async function listVerifications(facilityId) {
  try {
    const res = await client.get(`/facilities/${facilityId}/verifications`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function verifyTask(facilityId, taskId, data) {
  try {
    const res = await client.post(
      `/facilities/${facilityId}/verifications/${taskId}`,
      data
    );
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
