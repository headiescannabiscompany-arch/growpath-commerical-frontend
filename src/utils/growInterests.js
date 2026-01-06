import { INTEREST_TIERS } from "../config/interests.js";

const tierOneMetadata =
  INTEREST_TIERS.find((tier) => tier.tier === 1) || { id: "crops", options: [] };

export function getTier1Metadata() {
  return tierOneMetadata;
}

export function getTier1Options() {
  return Array.isArray(tierOneMetadata.options) ? [...tierOneMetadata.options] : [];
}

export function normalizeInterestList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

export function flattenGrowInterests(growInterests = {}) {
  const deduped = new Set();
  Object.values(growInterests).forEach((value) => {
    normalizeInterestList(value).forEach((tag) => deduped.add(tag));
  });
  return Array.from(deduped);
}

export function ensureTier1Selection(selected = []) {
  const cleaned = selected.filter(Boolean);
  if (cleaned.length > 0) {
    return Array.from(new Set(cleaned));
  }
  const defaults = getTier1Options().filter((option) => option !== "Cannabis");
  if (defaults.length > 0) {
    return defaults;
  }
  return getTier1Options();
}

export function normalizePendingInterests(raw) {
  if (!raw || typeof raw !== "object") return null;
  const normalized = {};
  Object.entries(raw).forEach(([key, value]) => {
    normalized[key] = normalizeInterestList(value);
  });
  normalized[tierOneMetadata.id] = ensureTier1Selection(normalized[tierOneMetadata.id]);
  return normalized;
}

export function filterPostsByInterests(posts, tier1Set, otherSet) {
  if (!tier1Set.size && !otherSet.size) return posts;
  return posts.filter((post) => {
    const tags = Array.isArray(post.tags) ? post.tags : [];

    if (tier1Set.size && !tags.some((tag) => tier1Set.has(tag))) {
      return false;
    }

    if (otherSet.size && !tags.some((tag) => otherSet.has(tag))) {
      return false;
    }

    return true;
  });
}
