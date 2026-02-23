/**
 * Content Marketplace API Client
 * Handles content uploads, sales, and analytics
 */

import apiClient from "./apiClient.js";

const enc = (v) => encodeURIComponent(String(v ?? ""));

export const MARKETPLACE_ROUTES = {
  BROWSE: "/api/marketplace/content",
  SEARCH: "/api/marketplace/search",
  UPLOAD: "/api/marketplace/upload",
  MY_UPLOADS: "/api/marketplace/my-uploads",
  GET_SALES: "/api/marketplace/sales",
  GET_ANALYTICS: (contentId) => `/api/marketplace/${enc(contentId)}/analytics`,
  UPDATE_PRICING: (contentId) => `/api/marketplace/${enc(contentId)}/pricing`,
  DELETE_CONTENT: (contentId) => `/api/marketplace/${enc(contentId)}`,
  PURCHASE: (contentId) => `/api/marketplace/${enc(contentId)}/purchase`
};

export const browseMarketplace = async (category, page = 1, limit = 20) => {
  try {
    const browseRes = await apiClient.get(MARKETPLACE_ROUTES.BROWSE, {
      params: { category, page, limit }
    });
    return browseRes.data;
  } catch (error) {
    throw new Error(`Failed to browse marketplace: ${error.message}`);
  }
};

export const searchContent = async (query, category) => {
  try {
    const searchRes = await apiClient.get(MARKETPLACE_ROUTES.SEARCH, {
      params: { q: query, category }
    });
    return searchRes.data;
  } catch (error) {
    throw new Error(`Failed to search content: ${error.message}`);
  }
};

export const uploadContent = async (formData) => {
  try {
    const uploadRes = await apiClient.post(MARKETPLACE_ROUTES.UPLOAD, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return uploadRes.data;
  } catch (error) {
    throw new Error(`Failed to upload content: ${error.message}`);
  }
};

export const getMyUploads = async () => {
  try {
    const myUploadsRes = await apiClient.get(MARKETPLACE_ROUTES.MY_UPLOADS);
    return myUploadsRes.data;
  } catch (error) {
    throw new Error(`Failed to fetch your uploads: ${error.message}`);
  }
};

export const getSalesData = async (period = "monthly") => {
  try {
    const salesRes = await apiClient.get(MARKETPLACE_ROUTES.GET_SALES, {
      params: { period }
    });
    return salesRes.data;
  } catch (error) {
    throw new Error(`Failed to fetch sales data: ${error.message}`);
  }
};

export const getContentAnalytics = async (contentId) => {
  try {
    const analyticsRes = await apiClient.get(MARKETPLACE_ROUTES.GET_ANALYTICS(contentId));
    return analyticsRes.data;
  } catch (error) {
    throw new Error(`Failed to fetch analytics: ${error.message}`);
  }
};

export const updateContentPricing = async (contentId, price) => {
  try {
    const pricingRes = await apiClient.put(MARKETPLACE_ROUTES.UPDATE_PRICING(contentId), {
      price
    });
    return pricingRes.data;
  } catch (error) {
    throw new Error(`Failed to update pricing: ${error.message}`);
  }
};

export const deleteContent = async (contentId) => {
  try {
    const deleteRes = await apiClient.delete(MARKETPLACE_ROUTES.DELETE_CONTENT(contentId));
    return deleteRes.data;
  } catch (error) {
    throw new Error(`Failed to delete content: ${error.message}`);
  }
};

export const purchaseContent = async (contentId) => {
  try {
    const purchaseRes = await apiClient.post(MARKETPLACE_ROUTES.PURCHASE(contentId));
    return purchaseRes.data;
  } catch (error) {
    throw new Error(`Failed to purchase content: ${error.message}`);
  }
};
