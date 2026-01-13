/**
 * Advertising API Client
 * Handles campaign management, budgets, and analytics
 */

import client from "./client.js";

export const ADVERTISING_ROUTES = {
  GET_CAMPAIGNS: "/api/advertising/campaigns",
  CREATE_CAMPAIGN: "/api/advertising/campaigns",
  GET_CAMPAIGN: "/api/advertising/campaigns/:campaignId",
  UPDATE_CAMPAIGN: "/api/advertising/campaigns/:campaignId",
  PAUSE_CAMPAIGN: "/api/advertising/campaigns/:campaignId/pause",
  RESUME_CAMPAIGN: "/api/advertising/campaigns/:campaignId/resume",
  DELETE_CAMPAIGN: "/api/advertising/campaigns/:campaignId",
  GET_ANALYTICS: "/api/advertising/campaigns/:campaignId/analytics",
  GET_BUDGET: "/api/advertising/budget",
  UPDATE_BUDGET: "/api/advertising/budget",
  GET_PERFORMANCE: "/api/advertising/performance"
};

export const getCampaigns = async () => {
  try {
    const response = await client.get(ADVERTISING_ROUTES.GET_CAMPAIGNS);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch campaigns: ${error.message}`);
  }
};

export const createCampaign = async (campaignData) => {
  try {
    const response = await client.post(ADVERTISING_ROUTES.CREATE_CAMPAIGN, campaignData);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to create campaign: ${error.message}`);
  }
};

export const getCampaignDetail = async (campaignId) => {
  try {
    const response = await client.get(
      ADVERTISING_ROUTES.GET_CAMPAIGN.replace(":campaignId", campaignId)
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch campaign: ${error.message}`);
  }
};

export const updateCampaign = async (campaignId, updates) => {
  try {
    const response = await client.put(
      ADVERTISING_ROUTES.UPDATE_CAMPAIGN.replace(":campaignId", campaignId),
      updates
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to update campaign: ${error.message}`);
  }
};

export const pauseCampaign = async (campaignId) => {
  try {
    const response = await client.post(
      ADVERTISING_ROUTES.PAUSE_CAMPAIGN.replace(":campaignId", campaignId)
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to pause campaign: ${error.message}`);
  }
};

export const resumeCampaign = async (campaignId) => {
  try {
    const response = await client.post(
      ADVERTISING_ROUTES.RESUME_CAMPAIGN.replace(":campaignId", campaignId)
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to resume campaign: ${error.message}`);
  }
};

export const deleteCampaign = async (campaignId) => {
  try {
    const response = await client.delete(
      ADVERTISING_ROUTES.DELETE_CAMPAIGN.replace(":campaignId", campaignId)
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to delete campaign: ${error.message}`);
  }
};

export const getCampaignAnalytics = async (campaignId, period = "daily") => {
  try {
    const response = await client.get(
      ADVERTISING_ROUTES.GET_ANALYTICS.replace(":campaignId", campaignId),
      { params: { period } }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch analytics: ${error.message}`);
  }
};

export const getBudgetInfo = async () => {
  try {
    const response = await client.get(ADVERTISING_ROUTES.GET_BUDGET);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch budget info: ${error.message}`);
  }
};

export const updateBudget = async (monthlyBudget, dailyLimit) => {
  try {
    const response = await client.put(ADVERTISING_ROUTES.UPDATE_BUDGET, {
      monthlyBudget,
      dailyLimit
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to update budget: ${error.message}`);
  }
};

export const getPerformanceReport = async (period = "monthly") => {
  try {
    const response = await client.get(ADVERTISING_ROUTES.GET_PERFORMANCE, {
      params: { period }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch performance report: ${error.message}`);
  }
};
