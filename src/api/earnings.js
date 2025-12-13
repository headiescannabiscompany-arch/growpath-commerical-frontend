import { client as api } from "./client";

export function getMyEarnings() {
  return api("/api/earnings/mine");
}

export function getEarningsByCourse() {
  return api("/api/earnings/by-course");
}

export function requestPayout(payoutMethod = "stripe") {
  return api("/api/earnings/request-payout", {
    method: "POST",
    body: JSON.stringify({ payoutMethod })
  });
}

export function getPlatformEarnings() {
  return api("/api/earnings/platform");
}
