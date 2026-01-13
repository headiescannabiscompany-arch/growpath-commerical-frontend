/**
 * Social Media API Client
 * Handles social platform connections and metrics
 */

import client from "./client.js";

export const SOCIAL_ROUTES = {
  CONNECT: "/api/social/connect",
  DISCONNECT: "/api/social/disconnect",
  GET_ACCOUNTS: "/api/social/accounts",
  GET_METRICS: "/api/social/:platform/metrics",
  SYNC_DATA: "/api/social/:platform/sync",
  POST_SCHEDULE: "/api/social/schedule-post"
};

export const connectSocialAccount = async (platform, accessToken, apiKey) => {
  try {
    const response = await client.post(SOCIAL_ROUTES.CONNECT, {
      platform,
      accessToken,
      apiKey
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to connect ${platform}: ${error.message}`);
  }
};

export const disconnectSocialAccount = async (platform) => {
  try {
    const response = await client.post(SOCIAL_ROUTES.DISCONNECT, {
      platform
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to disconnect ${platform}: ${error.message}`);
  }
};

export const getSocialAccounts = async () => {
  try {
    const response = await client.get(SOCIAL_ROUTES.GET_ACCOUNTS);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch social accounts: ${error.message}`);
  }
};

export const getSocialMetrics = async (platform) => {
  try {
    const response = await client.get(
      SOCIAL_ROUTES.GET_METRICS.replace(":platform", platform)
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch ${platform} metrics: ${error.message}`);
  }
};

export const syncSocialData = async (platform) => {
  try {
    const response = await client.post(
      SOCIAL_ROUTES.SYNC_DATA.replace(":platform", platform)
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to sync ${platform} data: ${error.message}`);
  }
};

export const schedulePost = async (platforms, content, scheduledTime) => {
  try {
    const response = await client.post(SOCIAL_ROUTES.POST_SCHEDULE, {
      platforms,
      content,
      scheduledTime
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to schedule post: ${error.message}`);
  }
};
