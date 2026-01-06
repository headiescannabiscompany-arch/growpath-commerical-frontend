import { INTEREST_TIERS } from "../config/interests.js";

const tierOneMetadata =
  INTEREST_TIERS.find((tier) => tier.tier === 1) || { id: "crops", options: [] };

const TAG_TO_TIER = {};
const TIER_OPTION_ORDER = {};
INTEREST_TIERS.forEach((tier) => {
  tier.options.forEach((option, index) => {
    TAG_TO_TIER[option] = tier.id;
    TIER_OPTION_ORDER[`${tier.id}:${option}`] = index;
  });
});

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

function defaultTagAccessor(entity) {
  if (!entity) return [];
  if (Array.isArray(entity.tags)) return entity.tags;
  if (Array.isArray(entity.tagList)) return entity.tagList;
  if (typeof entity.tags === "string") return [entity.tags];
  return [];
}

export function filterPostsByInterests(items, tier1Set, otherSet, tagAccessor = defaultTagAccessor) {
  if (!Array.isArray(items) || (!tier1Set?.size && !otherSet?.size)) return items || [];
  const pickTags = typeof tagAccessor === "function" ? tagAccessor : defaultTagAccessor;
  const tier1 = tier1Set instanceof Set ? tier1Set : new Set();
  const other = otherSet instanceof Set ? otherSet : new Set();

  return items.filter((item) => {
    const tags = normalizeInterestList(pickTags(item));
    if (tier1.size && !tags.some((tag) => tier1.has(tag))) {
      return false;
    }
    if (other.size && !tags.some((tag) => other.has(tag))) {
      return false;
    }
    return true;
  });
}

export function buildEmptyTierSelection() {
  const map = {};
  INTEREST_TIERS.forEach((tier) => {
    map[tier.id] = [];
  });
  return map;
}

export function groupTagsByTier(tags = []) {
  const grouped = buildEmptyTierSelection();
  if (!Array.isArray(tags)) return grouped;
  tags.forEach((tag) => {
    const tierId = TAG_TO_TIER[tag];
    if (!tierId) return;
    if (!grouped[tierId].includes(tag)) {
      grouped[tierId].push(tag);
    }
  });

  Object.entries(grouped).forEach(([tierId, values]) => {
    grouped[tierId] = values.sort((a, b) => {
      const orderA = TIER_OPTION_ORDER[`${tierId}:${a}`] ?? 0;
      const orderB = TIER_OPTION_ORDER[`${tierId}:${b}`] ?? 0;
      return orderA - orderB;
    });
  });

  return grouped;
}

export function flattenTierSelections(selections = {}) {
  const flattened = [];
  const seen = new Set();
  INTEREST_TIERS.forEach((tier) => {
    const values = Array.isArray(selections[tier.id]) ? selections[tier.id] : [];
    tier.options.forEach((option) => {
      if (values.includes(option) && !seen.has(option)) {
        flattened.push(option);
        seen.add(option);
      }
    });
  });
  return flattened;
}
