// src/api/advertising.js
/**
 * Lint-clean shim.
 * Replace with real API calls when advertising endpoints are wired.
 */

export async function listAds() {
  return { items: [] };
}

export async function trackAdImpression() {
  return { ok: true };
}

export async function trackAdClick() {
  return { ok: true };
}

const advertising = { listAds, trackAdImpression, trackAdClick };
export default advertising;
