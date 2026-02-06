import { api } from "./client";

const buildQuery = (params = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return "";
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `?${qs}`;
};

// List rooms for a facility
export const listRooms = async (facilityId) => {
  try {
    const response = await api.get(`/rooms${buildQuery({ facility: facilityId })}`);
    return {
      success: true,
      data: response?.rooms ?? response?.data ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to load rooms"
    };
  }
};

// Get room detail
export const getRoom = async (roomId) => {
  try {
    const response = await api.get(`/rooms/${roomId}`);
    return {
      success: true,
      data: response?.room ?? response?.data ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to load room"
    };
  }
};

// Create a new room
export const createRoom = async (facilityId, roomData) => {
  try {
    const response = await api.post("/rooms", {
      facilityId,
      ...roomData
    });
    return {
      success: true,
      data: response?.created ?? response?.room ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to create room"
    };
  }
};

// Update room
export const updateRoom = async (roomId, roomData) => {
  try {
    const response = await api.patch(`/rooms/${roomId}`, roomData);
    return {
      success: true,
      data: response?.updated ?? response?.room ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to update room"
    };
  }
};

// Delete room (soft delete)
export const deleteRoom = async (roomId) => {
  try {
    const response = await api.delete(`/rooms/${roomId}`);
    return {
      success: true,
      data: response?.deleted ?? response?.ok ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to delete room"
    };
  }
};

// Get facility details
export const getFacilityDetail = async (facilityId) => {
  try {
    const response = await api.get(`/facilities/${facilityId}`);
    return {
      success: true,
      data: response?.facility ?? response?.data ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to load facility"
    };
  }
};

// Facility Plan billing: get status
export const getFacilityBillingStatus = async (facilityId) => {
  try {
    const response = await api.get(
      `/facility-billing/status${buildQuery({ facility: facilityId })}`
    );
    return { success: true, data: response?.data ?? response };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to load billing status"
    };
  }
};

// Facility Plan billing: start checkout session
export const startFacilityCheckout = async (facilityId) => {
  try {
    const response = await api.post(`/facility-billing/checkout-session`, {
      facilityId
    });
    return { success: true, data: response?.data ?? response };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to start checkout"
    };
  }
};

// Facility Plan billing: cancel at period end
export const cancelFacilityPlan = async (facilityId) => {
  try {
    const response = await api.post(`/facility-billing/cancel`, { facilityId });
    return { success: true, data: response?.data ?? response };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to cancel plan"
    };
  }
};

// Metrc credentials management
export const getMetrcCredentials = async (facilityId) => {
  try {
    const response = await api.get(`/metrc/credentials/${facilityId}`);
    return { success: true, data: response?.data ?? response };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to load Metrc credentials"
    };
  }
};

export const saveMetrcCredentials = async (facilityId, vendorKey, userKey) => {
  try {
    const response = await api.post(`/metrc/credentials/${facilityId}`, {
      vendorKey,
      userKey
    });
    return { success: true, data: response?.data ?? response };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to save Metrc credentials"
    };
  }
};

export const deleteMetrcCredentials = async (facilityId) => {
  try {
    await api.delete(`/metrc/credentials/${facilityId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to delete Metrc credentials"
    };
  }
};

export const verifyMetrcCredentials = async (facilityId) => {
  try {
    const response = await api.get(`/metrc/credentials/${facilityId}/verify`);
    return { success: true, data: response?.data ?? response };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to verify Metrc credentials"
    };
  }
};

export const triggerMetrcSync = async (facilityId) => {
  try {
    const response = await api.post(`/metrc/sync/${facilityId}`);
    return { success: true, data: response?.data ?? response };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to start Metrc sync"
    };
  }
};

export const getMetrcSyncStatus = async (facilityId) => {
  try {
    const response = await api.get(`/metrc/sync/${facilityId}/status`);
    return { success: true, data: response?.data ?? response };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to load Metrc sync status"
    };
  }
};

// Update facility (including trackingMode)
export const updateFacility = async (facilityId, updates) => {
  try {
    const response = await api.patch(`/facilities/${facilityId}`, updates);
    return {
      success: true,
      data: response?.updated ?? response?.facility ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to update facility"
    };
  }
};

// BatchCycle endpoints
export const listBatchCycles = async (facilityId, roomId) => {
  try {
    const response = await api.get(
      `/batch-cycles${buildQuery({ facility: facilityId, room: roomId })}`
    );
    return {
      success: true,
      data: response?.data ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to load batch cycles"
    };
  }
};

export const createBatchCycle = async (facilityId, roomId, batchData) => {
  try {
    const response = await api.post("/batch-cycles", {
      facilityId,
      roomId,
      ...batchData
    });
    return {
      success: true,
      data: response?.created ?? response?.data ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to create batch cycle"
    };
  }
};

export const getBatchCycle = async (batchId) => {
  try {
    const response = await api.get(`/batch-cycles/${batchId}`);
    return {
      success: true,
      data: response?.data ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to load batch cycle"
    };
  }
};

export const updateBatchCycle = async (batchId, updates) => {
  try {
    const response = await api.patch(`/batch-cycles/${batchId}`, updates);
    return {
      success: true,
      data: response?.updated ?? response?.data ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to update batch cycle"
    };
  }
};

export const deleteBatchCycle = async (batchId) => {
  try {
    const response = await api.delete(`/batch-cycles/${batchId}`);
    return {
      success: true,
      data: response?.deleted ?? response?.ok ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to delete batch cycle"
    };
  }
};

// Zone endpoints (for greenhouse operations)
export const listZones = async (roomId) => {
  try {
    const response = await api.get(`/zones${buildQuery({ room: roomId })}`);
    return {
      success: true,
      data: response?.data ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to load zones"
    };
  }
};

export const createZone = async (roomId, zoneData) => {
  try {
    const response = await api.post("/zones", {
      roomId,
      ...zoneData
    });
    return {
      success: true,
      data: response?.created ?? response?.data ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to create zone"
    };
  }
};

export const updateZone = async (zoneId, updates) => {
  try {
    const response = await api.patch(`/zones/${zoneId}`, updates);
    return {
      success: true,
      data: response?.updated ?? response?.data ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to update zone"
    };
  }
};

export const deleteZone = async (zoneId) => {
  try {
    const response = await api.delete(`/zones/${zoneId}`);
    return {
      success: true,
      data: response?.deleted ?? response?.ok ?? response
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to delete zone"
    };
  }
};
