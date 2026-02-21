// src/api/deviation.js
// API module for deviation reports (legacy shim)
import { api } from "./client";
import { endpoints } from "./endpoints";

export async function listDeviations(facilityId) {
  try {
    const res = await api.get(endpoints.deviations(facilityId));
    return { success: true, data: res?.deviations ?? res?.logs ?? res?.data ?? res };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to load deviations" };
  }
}

export async function createDeviation(facilityId, data) {
  try {
    const res = await api.post(endpoints.deviations(facilityId), data);
    return { success: true, data: res?.created ?? res?.deviation ?? res };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to create deviation" };
  }
}
