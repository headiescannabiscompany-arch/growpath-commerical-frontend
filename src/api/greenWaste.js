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

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export const listGreenWasteEvents = async (facilityId) => {
  try {
    const response = await apiClient.get("/greenwaste", {
      params: { facility: facilityId }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, message: error.response?.data?.message || error.message };
  }
};

export const createGreenWasteEvent = async (facilityId, eventData) => {
  try {
    const response = await apiClient.post("/greenwaste", {
      facilityId,
      ...eventData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, message: error.response?.data?.message || error.message };
  }
};
