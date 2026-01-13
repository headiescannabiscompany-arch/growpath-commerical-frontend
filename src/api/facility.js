import axios from "axios";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.API_URL ||
  process.env.REACT_NATIVE_APP_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://your-app.onrender.com/api";

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// List rooms for a facility
export const listRooms = async (facilityId) => {
  try {
    const response = await apiClient.get("/rooms", {
      params: { facility: facilityId }
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Get room detail
export const getRoom = async (roomId) => {
  try {
    const response = await apiClient.get(`/rooms/${roomId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Create a new room
export const createRoom = async (facilityId, roomData) => {
  try {
    const response = await apiClient.post("/rooms", {
      facilityId,
      ...roomData
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Update room
export const updateRoom = async (roomId, roomData) => {
  try {
    const response = await apiClient.patch(`/rooms/${roomId}`, roomData);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Delete room (soft delete)
export const deleteRoom = async (roomId) => {
  try {
    const response = await apiClient.delete(`/rooms/${roomId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Get facility details
export const getFacilityDetail = async (facilityId) => {
  try {
    const response = await apiClient.get(`/facilities/${facilityId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Facility Plan billing: get status
export const getFacilityBillingStatus = async (facilityId) => {
  try {
    const response = await apiClient.get(`/facility-billing/status`, {
      params: { facility: facilityId }
    });
    return { success: true, data: response.data?.data || response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Facility Plan billing: start checkout session
export const startFacilityCheckout = async (facilityId) => {
  try {
    const response = await apiClient.post(`/facility-billing/checkout-session`, {
      facilityId
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Facility Plan billing: cancel at period end
export const cancelFacilityPlan = async (facilityId) => {
  try {
    const response = await apiClient.post(`/facility-billing/cancel`, { facilityId });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Metrc credentials management
export const getMetrcCredentials = async (facilityId) => {
  try {
    const response = await apiClient.get(`/metrc/credentials/${facilityId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

export const saveMetrcCredentials = async (facilityId, vendorKey, userKey) => {
  try {
    const response = await apiClient.post(`/metrc/credentials/${facilityId}`, {
      vendorKey,
      userKey
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

export const deleteMetrcCredentials = async (facilityId) => {
  try {
    const response = await apiClient.delete(`/metrc/credentials/${facilityId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

export const verifyMetrcCredentials = async (facilityId) => {
  try {
    const response = await apiClient.get(`/metrc/credentials/${facilityId}/verify`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

export const triggerMetrcSync = async (facilityId) => {
  try {
    const response = await apiClient.post(`/metrc/sync/${facilityId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

export const getMetrcSyncStatus = async (facilityId) => {
  try {
    const response = await apiClient.get(`/metrc/sync/${facilityId}/status`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Update facility (including trackingMode)
export const updateFacility = async (facilityId, updates) => {
  try {
    const response = await apiClient.patch(`/facilities/${facilityId}`, updates);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// BatchCycle endpoints
export const listBatchCycles = async (facilityId, roomId) => {
  try {
    const params = { facility: facilityId };
    if (roomId) params.room = roomId;
    const response = await apiClient.get("/batch-cycles", { params });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

export const createBatchCycle = async (facilityId, roomId, batchData) => {
  try {
    const response = await apiClient.post("/batch-cycles", {
      facilityId,
      roomId,
      ...batchData
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

export const getBatchCycle = async (batchId) => {
  try {
    const response = await apiClient.get(`/batch-cycles/${batchId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

export const updateBatchCycle = async (batchId, updates) => {
  try {
    const response = await apiClient.patch(`/batch-cycles/${batchId}`, updates);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

export const deleteBatchCycle = async (batchId) => {
  try {
    const response = await apiClient.delete(`/batch-cycles/${batchId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

// Zone endpoints (for greenhouse operations)
export const listZones = async (roomId) => {
  try {
    const response = await apiClient.get("/zones", { params: { room: roomId } });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

export const createZone = async (roomId, zoneData) => {
  try {
    const response = await apiClient.post("/zones", {
      roomId,
      ...zoneData
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

export const updateZone = async (zoneId, updates) => {
  try {
    const response = await apiClient.patch(`/zones/${zoneId}`, updates);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

export const deleteZone = async (zoneId) => {
  try {
    const response = await apiClient.delete(`/zones/${zoneId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};
