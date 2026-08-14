/**
 * External channel API client.
 * Handles off-platform channel connections, metrics, sync, and scheduling.
 */

import apiClient from "./apiClient.js";

const enc = (v) => encodeURIComponent(String(v ?? ""));

export const SOCIAL_ROUTES = {
  CONNECT: (platform) => `/api/social/platforms/${enc(platform)}/connect`,
  DISCONNECT: (platform) => `/api/social/platforms/${enc(platform)}/disconnect`,
  GET_ACCOUNTS: "/api/social/platforms",
  GET_METRICS: (platform) => `/api/social/metrics/${enc(platform)}`,
  SYNC_DATA: (platform) => `/api/social/platforms/${enc(platform)}/sync`
};

export const EXTERNAL_POST_SCHEDULING_AVAILABLE = false;

export const connectSocialAccount = async (platform, accessToken, apiKey) => {
  try {
    const connectRes = await apiClient.post(SOCIAL_ROUTES.CONNECT(platform), {
      accessToken,
      apiKey
    });
    return connectRes.data;
  } catch (error) {
    throw new Error(`Failed to connect ${platform}: ${error.message}`);
  }
};

export const disconnectSocialAccount = async (platform) => {
  try {
    const disconnectRes = await apiClient.post(SOCIAL_ROUTES.DISCONNECT(platform));
    return disconnectRes.data;
  } catch (error) {
    throw new Error(`Failed to disconnect ${platform}: ${error.message}`);
  }
};

export const getSocialAccounts = async () => {
  try {
    const accountsRes = await apiClient.get(SOCIAL_ROUTES.GET_ACCOUNTS);
    return accountsRes.data;
  } catch (error) {
    throw new Error(`Failed to fetch external channel accounts: ${error.message}`);
  }
};

export const getSocialMetrics = async (platform) => {
  try {
    const metricsRes = await apiClient.get(SOCIAL_ROUTES.GET_METRICS(platform));
    return metricsRes.data;
  } catch (error) {
    throw new Error(`Failed to fetch ${platform} metrics: ${error.message}`);
  }
};

export const syncSocialData = async (platform) => {
  try {
    const syncRes = await apiClient.post(SOCIAL_ROUTES.SYNC_DATA(platform));
    return syncRes.data;
  } catch (error) {
    throw new Error(`Failed to sync ${platform} data: ${error.message}`);
  }
};

export const schedulePost = async (platforms, content, scheduledTime) => {
  void platforms;
  void content;
  void scheduledTime;
  throw new Error(
    "External post scheduling is not configured. Use the connected provider directly."
  );
};
