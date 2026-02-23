// src/api/deviation.js
// API module for deviation reports (legacy shim)
import { api } from "./client";
import { endpoints } from "./endpoints";

export async function listDeviations(facilityId) {
  try {
    const listRes = await api.get(endpoints.deviations(facilityId));
    return { success: true, data: listRes?.deviations ?? listRes?.logs ?? listRes?.data ?? listRes };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to load deviations" };
  }
}

export async function createDeviation(facilityId, data) {
  try {
    const createRes = await api.post(endpoints.deviations(facilityId), data);
    return { success: true, data: createRes?.created ?? createRes?.deviation ?? createRes };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to create deviation" };
  }
}
