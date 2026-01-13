// src/api/vendorAnalytics.js
// API module for vendor analytics (Commercial users)
import client from "./client";

export async function getVendorAnalytics(vendorId) {
  try {
    const res = await client.get(`/vendors/${vendorId}/analytics`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function getVendorOrders(vendorId) {
  try {
    const res = await client.get(`/vendors/${vendorId}/orders`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
