"use strict";

const MB = 1024 * 1024;
const GB = 1024 * MB;

const DEFAULT_VIDEO_STORAGE_LIMITS = Object.freeze({
  free: 500 * MB,
  pro: 10 * GB,
  creator_plus: 25 * GB,
  commercial: 50 * GB,
  facility: 100 * GB
});

function normalizedPlan(value) {
  const plan = String(value || "free")
    .trim()
    .toLowerCase();
  return Object.prototype.hasOwnProperty.call(DEFAULT_VIDEO_STORAGE_LIMITS, plan)
    ? plan
    : "free";
}

function configuredLimit(plan) {
  const key = `VIDEO_STORAGE_LIMIT_BYTES_${plan.toUpperCase()}`;
  const configured = Number(process.env[key]);
  return Number.isFinite(configured) && configured >= 0
    ? Math.floor(configured)
    : DEFAULT_VIDEO_STORAGE_LIMITS[plan];
}

function videoStorageLimitBytes(plan) {
  return configuredLimit(normalizedPlan(plan));
}

function videoStoragePolicy(plan) {
  const normalized = normalizedPlan(plan);
  return {
    plan: normalized,
    limitBytes: configuredLimit(normalized),
    externalSourcesConsumeStorage: false,
    growPathUploadsConsumeStorage: true
  };
}

module.exports = {
  DEFAULT_VIDEO_STORAGE_LIMITS,
  normalizedPlan,
  videoStorageLimitBytes,
  videoStoragePolicy
};
