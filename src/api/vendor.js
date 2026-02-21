// src/api/vendor.js
// API module for vendor management (legacy shim)
import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export async function listVendors(facilityId) {
  try {
    const res = await apiRequest(endpoints.vendors, {
      params: { facilityId }
    });
    return { success: true, data: res?.vendors ?? res?.data ?? res };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to load vendors" };
  }
}

export async function createVendor(facilityId, data) {
  try {
    const res = await apiRequest(endpoints.vendors, {
      method: "POST",
      body: { facilityId, ...data }
    });
    return { success: true, data: res?.created ?? res?.vendor ?? res };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to create vendor" };
  }
}

export async function updateVendor(facilityId, vendorId, data) {
  try {
    const res = await apiRequest(endpoints.vendor(vendorId), {
      method: "PUT",
      body: data
    });
    return { success: true, data: res?.updated ?? res?.vendor ?? res };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to update vendor" };
  }
}

export async function deleteVendor(facilityId, vendorId) {
  try {
    const res = await apiRequest(endpoints.vendor(vendorId), {
      method: "DELETE"
    });
    return { success: true, data: res?.deleted ?? res?.ok ?? res };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to delete vendor" };
  }
}
