// src/api/equipment.js
// API module for equipment management
import client from "./client";

export async function listEquipment(facilityId) {
  try {
    const res = await client.get(`/facilities/${facilityId}/equipment`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function createEquipment(facilityId, data) {
  try {
    const res = await client.post(`/facilities/${facilityId}/equipment`, data);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function updateEquipment(facilityId, equipmentId, data) {
  try {
    const res = await client.put(
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
    const res = await client.delete(`/facilities/${facilityId}/equipment/${equipmentId}`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
