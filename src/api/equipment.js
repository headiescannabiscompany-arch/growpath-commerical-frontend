// src/api/equipment.js
// API module for equipment management
import { apiRequest } from "./apiRequest";

export async function listEquipment(facilityId) {
  try {
    const res = await apiRequest(`/facilities/${facilityId}/equipment`);
    return { success: true, data: res?.data ?? res };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function createEquipment(facilityId, data) {
  try {
    const res = await apiRequest(`/facilities/${facilityId}/equipment`, {
      method: "POST",
      body: data
    });
    return { success: true, data: res?.data ?? res };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function updateEquipment(facilityId, equipmentId, data) {
  try {
    const res = await apiRequest(`/facilities/${facilityId}/equipment/${equipmentId}`, {
      method: "PUT",
      body: data
    });
    return { success: true, data: res?.data ?? res };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function deleteEquipment(facilityId, equipmentId) {
  try {
    const res = await apiRequest(`/facilities/${facilityId}/equipment/${equipmentId}`, {
      method: "DELETE"
    });
    return { success: true, data: res?.data ?? res };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
