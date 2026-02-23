// src/api/vendor.js
// API module for vendor management (legacy shim)
import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export async function listVendors(facilityId) {
  try {
    const listRes = await apiRequest(endpoints.vendors, {
      params: { facilityId }
    });
    return { success: true, data: listRes?.vendors ?? listRes?.data ?? listRes };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to load vendors" };
  }
}

export async function createVendor(facilityId, data) {
  try {
    const createRes = await apiRequest(endpoints.vendors, {
      method: "POST",
      body: { facilityId, ...data }
    });
    return { success: true, data: createRes?.created ?? createRes?.vendor ?? createRes };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to create vendor" };
  }
}

export async function updateVendor(facilityId, vendorId, data) {
  try {
    const updateRes = await apiRequest(endpoints.vendor(vendorId), {
      method: "PUT",
      body: data
    });
    return { success: true, data: updateRes?.updated ?? updateRes?.vendor ?? updateRes };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to update vendor" };
  }
}

export async function deleteVendor(facilityId, vendorId) {
  try {
    const deleteRes = await apiRequest(endpoints.vendor(vendorId), {
      method: "DELETE"
    });
    return { success: true, data: deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes };
  } catch (e) {
    return { success: false, message: e?.message || "Failed to delete vendor" };
  }
}
