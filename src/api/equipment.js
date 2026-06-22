// src/api/equipment.js
// API module for equipment management
import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export async function listEquipment(facilityId) {
  try {
    const listRes = await apiRequest(endpoints.equipment(facilityId));
    return { success: true, data: listRes?.data ?? listRes };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function createEquipment(facilityId, data) {
  try {
    const createRes = await apiRequest(endpoints.equipment(facilityId), {
      method: "POST",
      body: data
    });
    return { success: true, data: createRes?.data ?? createRes };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function updateEquipment(facilityId, equipmentId, data) {
  try {
    const updateRes = await apiRequest(endpoints.equipmentItem(facilityId, equipmentId), {
      method: "PATCH",
      body: data
    });
    return { success: true, data: updateRes?.data ?? updateRes };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function deleteEquipment(facilityId, equipmentId) {
  try {
    const deleteRes = await apiRequest(endpoints.equipmentItem(facilityId, equipmentId), {
      method: "DELETE"
    });
    return { success: true, data: deleteRes?.data ?? deleteRes };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
