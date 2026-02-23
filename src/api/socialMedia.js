/**
 * Social Media API Client
 * Handles social platform connections and metrics
 */

import apiClient from "./apiClient.js";

const enc = (v) => encodeURIComponent(String(v ?? ""));

export const SOCIAL_ROUTES = {
  CONNECT: "/api/social/connect",
  DISCONNECT: "/api/social/disconnect",
  GET_ACCOUNTS: "/api/social/accounts",
  GET_METRICS: (platform) => `/api/social/${enc(platform)}/metrics`,
  SYNC_DATA: (platform) => `/api/social/${enc(platform)}/sync`,
  POST_SCHEDULE: "/api/social/schedule-post"
};

export const connectSocialAccount = async (platform, accessToken, apiKey) => {
  try {
    const connectRes = await apiClient.post(SOCIAL_ROUTES.CONNECT, {
      platform,
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
    const disconnectRes = await apiClient.post(SOCIAL_ROUTES.DISCONNECT, {
      platform
    });
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
    throw new Error(`Failed to fetch social accounts: ${error.message}`);
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
  try {
    const scheduleRes = await apiClient.post(SOCIAL_ROUTES.POST_SCHEDULE, {
      platforms,
      content,
      scheduledTime
    });
    return scheduleRes.data;
  } catch (error) {
    throw new Error(`Failed to schedule post: ${error.message}`);
  }
};
