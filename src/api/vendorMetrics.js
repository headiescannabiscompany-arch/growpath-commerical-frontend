// src/api/vendorMetrics.js
// API module for vendor metrics, soil/nute, and equipment tracking (Commercial users)
import apiClient from "./client";

export async function getVendorMetrics(vendorId) {
  try {
    const res = await apiClient.get(`/vendors/${vendorId}/metrics`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function listVendorSoilMixes(vendorId) {
  try {
    const res = await apiClient.get(`/vendors/${vendorId}/soil-mixes`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function createVendorSoilMix(vendorId, data) {
  try {
    const res = await apiClient.post(`/vendors/${vendorId}/soil-mixes`, data);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function listVendorEquipment(vendorId) {
  try {
    const res = await apiClient.get(`/vendors/${vendorId}/equipment`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
