import { api } from "./client";
import { endpoints } from "./endpoints";

export const listGreenWasteEvents = async (facilityId) => {
  try {
    const response = await api.get(endpoints.greenWaste(facilityId));
    return { success: true, data: response?.logs ?? response?.data ?? response };
  } catch (error) {
    return { success: false, message: error?.message || "Failed to load green waste" };
  }
};

export const createGreenWasteEvent = async (facilityId, eventData) => {
  try {
    const response = await api.post(endpoints.greenWaste(facilityId), eventData);
    return { success: true, data: response?.created ?? response?.log ?? response };
  } catch (error) {
    return { success: false, message: error?.message || "Failed to create event" };
  }
};
