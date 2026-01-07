import { describe, it } from "node:test";
import assert from "node:assert/strict";

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

    assert.deepEqual(
      new Set(flattened),
      new Set(["Cannabis", "Herbs", "Indoor", "Hydroponics"])
    );
  });

  it("ensures tier 1 selection falls back to defaults when empty", () => {
    const fallback = ensureTier1Selection([]);
    assert.ok(fallback.length > 0, "should have fallback crops");
    assert.ok(!fallback.includes("Cannabis"), "fallback should exclude Cannabis");

    const custom = ensureTier1Selection(["Herbs", "Herbs"]);
    assert.deepEqual(custom, ["Herbs"], "should dedupe explicit selections");
  });

  it("normalizes pending onboarding interests and injects tier 1 defaults", () => {
    const normalized = normalizePendingInterests({
      crops: [],
      environment: "Indoor"
    });

    assert.ok(Array.isArray(normalized.environment), "environment should be array");
    assert.ok(normalized.crops.length > 0, "crops should default to tier 1 set");
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
    assert.deepEqual(
      filtered.map((p) => p._id),
      ["3"],
      "should only include posts matching tier 1 and the other-tier filters"
    );

    const tierOnly = filterPostsByInterests(posts, tier1Set, new Set());
    assert.deepEqual(tierOnly.map((p) => p._id), ["1", "3"]);

    const noFilters = filterPostsByInterests(posts, new Set(), new Set());
    assert.equal(noFilters.length, posts.length, "no filters should return all posts");
  });
});
