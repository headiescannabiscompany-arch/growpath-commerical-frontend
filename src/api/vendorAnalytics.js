// src/api/vendorAnalytics.js
// API module for vendor analytics (Commercial users)
import { apiRequest } from "./apiRequest";

export async function getVendorAnalytics(vendorId) {
  try {
    const analyticsRes = await apiRequest(`/vendors/${vendorId}/analytics`);
    return { success: true, data: analyticsRes?.data ?? analyticsRes };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function getVendorOrders(vendorId) {
  try {
    const ordersRes = await apiRequest(`/vendors/${vendorId}/orders`);
    return { success: true, data: ordersRes?.data ?? ordersRes };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
