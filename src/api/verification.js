// src/api/verification.js
// API module for task verification (legacy shim)
import { api } from "./client";
import { endpoints } from "./endpoints";

export async function listVerifications(facilityId) {
  try {
    const res = await api.get(endpoints.verification(facilityId));
    return {
      success: true,
      data: res?.records ?? res?.verifications ?? res?.data ?? res
    };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to load verifications" };
  }
}

export async function verifyTask(facilityId, taskId, data) {
  try {
    const res = await api.post(endpoints.verificationRecord(facilityId, taskId), data);
    return { success: true, data: res?.updated ?? res?.record ?? res };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to verify record" };
  }
}
