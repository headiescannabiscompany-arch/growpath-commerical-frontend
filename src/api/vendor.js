// src/api/vendor.js
// API module for vendor management
import client from "./client";

export async function listVendors(facilityId) {
  try {
    const res = await client.get(`/api/facilities/${facilityId}/vendors`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function createVendor(facilityId, data) {
  try {
    const res = await client.post(`/api/facilities/${facilityId}/vendors`, data);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function updateVendor(facilityId, vendorId, data) {
  try {
    const res = await client.put(
      `/api/facilities/${facilityId}/vendors/${vendorId}`,
      data
    );
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function deleteVendor(facilityId, vendorId) {
  try {
    const res = await client.delete(`/api/facilities/${facilityId}/vendors/${vendorId}`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
