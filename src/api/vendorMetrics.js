// src/api/vendorMetrics.js
// API module for vendor metrics, soil/nute, and equipment tracking (Commercial users)
import { apiRequest } from "./apiRequest";

export async function getVendorMetrics(vendorId) {
  try {
    const metricsRes = await apiRequest(`/vendors/${vendorId}/metrics`);
    return { success: true, data: metricsRes?.data ?? metricsRes };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function listVendorSoilMixes(vendorId) {
  try {
    const soilMixesRes = await apiRequest(`/vendors/${vendorId}/soil-mixes`);
    return { success: true, data: soilMixesRes?.data ?? soilMixesRes };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function createVendorSoilMix(vendorId, data) {
  try {
    const createSoilMixRes = await apiRequest(`/vendors/${vendorId}/soil-mixes`, {
      method: "POST",
      body: data
    });
    return { success: true, data: createSoilMixRes?.data ?? createSoilMixRes };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function listVendorEquipment(vendorId) {
  try {
    const equipmentRes = await apiRequest(`/vendors/${vendorId}/equipment`);
    return { success: true, data: equipmentRes?.data ?? equipmentRes };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
