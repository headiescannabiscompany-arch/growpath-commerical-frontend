// src/api/vendorAnalytics.js
// API module for vendor analytics (Commercial users)
import { apiRequest } from "./apiRequest";

export async function getVendorAnalytics(vendorId) {
  try {
    const res = await apiRequest(`/vendors/${vendorId}/analytics`);
    return { success: true, data: res?.data ?? res };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function getVendorOrders(vendorId) {
  try {
    const res = await apiRequest(`/vendors/${vendorId}/orders`);
    return { success: true, data: res?.data ?? res };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
