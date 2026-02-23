import { api } from "./client";
import { endpoints } from "./endpoints";

export const listGreenWasteEvents = async (facilityId) => {
  try {
    const listRes = await api.get(endpoints.greenWaste(facilityId));
    return { success: true, data: listRes?.logs ?? listRes?.data ?? listRes };
  } catch (error) {
    return { success: false, message: error?.message || "Failed to load green waste" };
  }
};

export const createGreenWasteEvent = async (facilityId, eventData) => {
  try {
    const createRes = await api.post(endpoints.greenWaste(facilityId), eventData);
    return { success: true, data: createRes?.created ?? createRes?.log ?? createRes };
  } catch (error) {
    return { success: false, message: error?.message || "Failed to create event" };
  }
};
