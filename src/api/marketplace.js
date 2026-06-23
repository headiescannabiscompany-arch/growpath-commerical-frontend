/**
 * Content Marketplace API Client
 * Handles content uploads, sales, and analytics
 */

import { apiRequest } from "./apiRequest";

const enc = (v) => encodeURIComponent(String(v ?? ""));

export const MARKETPLACE_ROUTES = {
  BROWSE: "/api/marketplace/browse",
  SEARCH: "/api/marketplace/browse",
  DETAIL: (contentId) => `/api/marketplace/${enc(contentId)}`,
  UPLOAD: "/api/marketplace/create",
  MY_UPLOADS: "/api/marketplace/user/my-uploads",
  GET_SALES: "/api/marketplace/user/my-uploads",
  GET_ANALYTICS: (contentId) => `/api/marketplace/${enc(contentId)}/analytics`,
  UPDATE_PRICING: (contentId) => `/api/marketplace/${enc(contentId)}/pricing`,
  DELETE_CONTENT: (contentId) => `/api/marketplace/${enc(contentId)}`,
  PURCHASE: (contentId) => `/api/marketplace/${enc(contentId)}/purchase`
};

function rows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.uploads)) return payload.uploads;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.uploads)) return payload.data.uploads;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizeList(payload) {
  const list = rows(payload);
  return {
    ...payload,
    data: list,
    uploads: list,
    pagination: payload?.pagination || payload?.data?.pagination || null
  };
}

function monthKey(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toISOString().slice(0, 7);
}

export function buildSalesSummary(uploads = []) {
  const monthlyMap = new Map();
  const recentSales = [];
  const summary = uploads.reduce(
    (acc, upload) => {
      const downloads = Number(upload?.downloads || 0);
      const sales = Number(upload?.sales || 0);
      const revenue = Number(upload?.revenue || 0);
      const rating = Number(upload?.rating || 0);
      const reviewCount = Array.isArray(upload?.reviews)
        ? upload.reviews.length
        : Number(upload?.reviewCount || 0);
      const key = monthKey(upload?.updatedAt || upload?.createdAt);
      const month = monthlyMap.get(key) || { month: key, earnings: 0, sales: 0, downloads: 0 };
      month.earnings += revenue;
      month.sales += sales;
      month.downloads += downloads;
      monthlyMap.set(key, month);

      if (sales > 0 || revenue > 0) {
        recentSales.push({
          id: upload?._id || upload?.id || upload?.title,
          title: upload?.title || "Marketplace upload",
          buyer: "Marketplace customer",
          amount: revenue || Number(upload?.price || 0),
          date: upload?.updatedAt || upload?.createdAt || null
        });
      }

      acc.totalEarnings += revenue;
      acc.totalDownloads += downloads;
      acc.totalSales += sales;
      acc.ratingSum += rating * Math.max(1, reviewCount);
      acc.ratingWeight += Math.max(1, reviewCount);
      return acc;
    },
    {
      totalEarnings: 0,
      totalDownloads: 0,
      totalSales: 0,
      ratingSum: 0,
      ratingWeight: 0
    }
  );

  return {
    summary: {
      totalEarnings: summary.totalEarnings,
      totalDownloads: summary.totalDownloads,
      totalSales: summary.totalSales,
      averageRating: summary.ratingWeight ? summary.ratingSum / summary.ratingWeight : 0
    },
    monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
    recentSales: recentSales.slice(0, 20),
    uploads
  };
}

export const browseMarketplace = async (category, page = 1, limit = 20) => {
  try {
    const browseRes = await apiRequest(MARKETPLACE_ROUTES.BROWSE, {
      method: "GET",
      params: { category: category === "all" ? undefined : category, page, limit }
    });
    return normalizeList(browseRes);
  } catch (error) {
    throw new Error(`Failed to browse marketplace: ${error.message}`);
  }
};

export const searchContent = async (query, category) => {
  try {
    const searchRes = await apiRequest(MARKETPLACE_ROUTES.SEARCH, {
      method: "GET",
      params: { search: query, category: category === "all" ? undefined : category }
    });
    return normalizeList(searchRes);
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
    return normalizeList(myUploadsRes);
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
    const uploads = rows(salesRes);
    return { data: buildSalesSummary(uploads), uploads };
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
