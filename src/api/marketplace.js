/**
 * Content Marketplace API Client
 * Handles content uploads, sales, and analytics
 */

import { apiRequest } from "./apiRequest";

const enc = (v) => encodeURIComponent(String(v ?? ""));

export const MARKETPLACE_ROUTES = {
  BROWSE: "/api/marketplace/content",
  SEARCH: "/api/marketplace/search",
  DETAIL: (contentId) => `/api/marketplace/${enc(contentId)}`,
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
    const browseRes = await apiRequest(MARKETPLACE_ROUTES.BROWSE, {
      method: "GET",
      params: { category, page, limit }
    });
    return browseRes;
  } catch (error) {
    throw new Error(`Failed to browse marketplace: ${error.message}`);
  }
};

export const searchContent = async (query, category) => {
  try {
    const searchRes = await apiRequest(MARKETPLACE_ROUTES.SEARCH, {
      method: "GET",
      params: { q: query, category }
    });
    return searchRes;
  } catch (error) {
    throw new Error(`Failed to search content: ${error.message}`);
  }
};

export const getMarketplaceContent = async (contentId) => {
  try {
    const detailRes = await apiRequest(MARKETPLACE_ROUTES.DETAIL(contentId), {
      method: "GET"
    });
    return detailRes?.content ?? detailRes?.data?.content ?? detailRes?.data ?? detailRes;
  } catch (error) {
    throw new Error(`Failed to load marketplace content: ${error.message}`);
  }
};

export const uploadContent = async (formData) => {
  try {
    const uploadRes = await apiRequest(MARKETPLACE_ROUTES.UPLOAD, {
      method: "POST",
      body: formData
    });
    return uploadRes;
  } catch (error) {
    throw new Error(`Failed to upload content: ${error.message}`);
  }
};

export const getMyUploads = async () => {
  try {
    const myUploadsRes = await apiRequest(MARKETPLACE_ROUTES.MY_UPLOADS, { method: "GET" });
    return myUploadsRes;
  } catch (error) {
    throw new Error(`Failed to fetch your uploads: ${error.message}`);
  }
};

export const getSalesData = async (period = "monthly") => {
  try {
    const salesRes = await apiRequest(MARKETPLACE_ROUTES.GET_SALES, {
      method: "GET",
      params: { period }
    });
    return salesRes;
  } catch (error) {
    throw new Error(`Failed to fetch sales data: ${error.message}`);
  }
};

export const getContentAnalytics = async (contentId) => {
  try {
    const analyticsRes = await apiRequest(MARKETPLACE_ROUTES.GET_ANALYTICS(contentId), {
      method: "GET"
    });
    return analyticsRes;
  } catch (error) {
    throw new Error(`Failed to fetch analytics: ${error.message}`);
  }
};

export const updateContentPricing = async (contentId, price) => {
  try {
    const pricingRes = await apiRequest(MARKETPLACE_ROUTES.UPDATE_PRICING(contentId), {
      method: "PUT",
      body: { price }
    });
    return pricingRes;
  } catch (error) {
    throw new Error(`Failed to update pricing: ${error.message}`);
  }
};

export const deleteContent = async (contentId) => {
  try {
    const deleteRes = await apiRequest(MARKETPLACE_ROUTES.DELETE_CONTENT(contentId), {
      method: "DELETE"
    });
    return deleteRes;
  } catch (error) {
    throw new Error(`Failed to delete content: ${error.message}`);
  }
};

export const purchaseContent = async (contentId) => {
  try {
    const purchaseRes = await apiRequest(MARKETPLACE_ROUTES.PURCHASE(contentId), {
      method: "POST"
    });
    return purchaseRes;
  } catch (error) {
    throw new Error(`Failed to purchase content: ${error.message}`);
  }
};
