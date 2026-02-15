// src/api/equipment.js
// API module for equipment management
import apiClient from "./client";

export async function listEquipment(facilityId) {
  try {
    const res = await apiClient.get(`/facilities/${facilityId}/equipment`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function createEquipment(facilityId, data) {
  try {
    const res = await apiClient.post(`/facilities/${facilityId}/equipment`, data);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function updateEquipment(facilityId, equipmentId, data) {
  try {
    const res = await apiClient.put(
      `/facilities/${facilityId}/equipment/${equipmentId}`,
      data
    );
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function deleteEquipment(facilityId, equipmentId) {
  try {
    const res = await apiClient.delete(
      `/facilities/${facilityId}/equipment/${equipmentId}`
    );
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
