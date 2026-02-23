// src/api/verification.js
// API module for task verification (legacy shim)
import { api } from "./client";
import { endpoints } from "./endpoints";

export async function listVerifications(facilityId) {
  try {
    const listRes = await api.get(endpoints.verification(facilityId));
    return {
      success: true,
      data: listRes?.records ?? listRes?.verifications ?? listRes?.data ?? listRes
    };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to load verifications" };
  }
}

export async function verifyTask(facilityId, taskId, data) {
  try {
    const verifyRes = await api.post(endpoints.verificationRecord(facilityId, taskId), data);
    return { success: true, data: verifyRes?.updated ?? verifyRes?.record ?? verifyRes };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to verify record" };
  }
}
