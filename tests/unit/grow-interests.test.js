import { describe, it, expect } from "@jest/globals";

import {
  ensureTier1Selection,
  flattenGrowInterests,
  filterPostsByInterests,
  normalizePendingInterests
} from "../../src/utils/growInterests.js";

describe("growInterests utils", () => {
  it("deduplicates and flattens interest buckets", () => {
    const flattened = flattenGrowInterests({
      crops: ["Cannabis", "Herbs"],
      environment: "Indoor",
      methods: ["Hydroponics", "Hydroponics"],
      goals: []
    });

    expect(new Set(flattened)).toEqual(
      new Set(["Cannabis", "Herbs", "Indoor", "Hydroponics"])
    );
  });

  it("ensures tier 1 selection falls back to defaults when empty", () => {
    const fallback = ensureTier1Selection([]);
    expect(fallback.length).toBeGreaterThan(0);
    expect(fallback.includes("Cannabis")).toBe(false);

    const custom = ensureTier1Selection(["Herbs", "Herbs"]);
    expect(custom).toEqual(["Herbs"]);
  });

  it("normalizes pending onboarding interests and injects tier 1 defaults", () => {
    const normalized = normalizePendingInterests({
      crops: [],
      environment: "Indoor"
    });

    expect(Array.isArray(normalized.environment)).toBe(true);
    expect(normalized.crops.length).toBeGreaterThan(0);
  });

  it("filters posts using OR logic across tier 1 and other tiers", () => {
    const posts = [
      { _id: "1", tags: ["Cannabis", "Indoor"] },
      { _id: "2", tags: ["Vegetables", "Outdoor"] },
      { _id: "3", tags: ["Cannabis", "Hydroponics"] }
    ];

    const tier1Set = new Set(["Cannabis"]);
    const otherSet = new Set(["Hydroponics"]);

    const filtered = filterPostsByInterests(posts, tier1Set, otherSet);
    expect(filtered.map((p) => p._id)).toEqual(["3"]);

    const tierOnly = filterPostsByInterests(posts, tier1Set, new Set());
    expect(tierOnly.map((p) => p._id)).toEqual(["1", "3"]);

    const noFilters = filterPostsByInterests(posts, new Set(), new Set());
    expect(noFilters.length).toBe(posts.length);
  });
});
