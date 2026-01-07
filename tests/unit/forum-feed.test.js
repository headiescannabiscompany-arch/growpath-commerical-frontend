import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { shouldAutoFetchMore } from "../../src/utils/forumFeed.js";

const baseArgs = {
  filteredCount: 0,
  lastFilteredCount: 0,
  pageSize: 20,
  hasNextPage: true,
  isFetching: false
};

describe("forum feed auto-fetch helper", () => {
  it("requests next page when filtered list grows and we are below a full page", () => {
    const decision = shouldAutoFetchMore({
      ...baseArgs,
      filteredCount: 5,
      lastFilteredCount: 3
    });
    assert.equal(decision.shouldFetch, true);
    assert.equal(decision.nextLastCount, 5);
  });

  it("stops when new page produced no additional posts", () => {
    const decision = shouldAutoFetchMore({
      ...baseArgs,
      filteredCount: 3,
      lastFilteredCount: 5
    });
    assert.equal(decision.shouldFetch, false);
    assert.equal(decision.nextLastCount, 3);
  });

  it("stops when filtered list already has at least one full page", () => {
    const decision = shouldAutoFetchMore({
      ...baseArgs,
      filteredCount: 20,
      lastFilteredCount: 10
    });
    assert.equal(decision.shouldFetch, false);
  });

  it("stops when backend has no additional pages", () => {
    const decision = shouldAutoFetchMore({
      ...baseArgs,
      filteredCount: 5,
      lastFilteredCount: 2,
      hasNextPage: false
    });
    assert.equal(decision.shouldFetch, false);
  });

  it("stops when already fetching", () => {
    const decision = shouldAutoFetchMore({
      ...baseArgs,
      filteredCount: 5,
      lastFilteredCount: 2,
      isFetching: true
    });
    assert.equal(decision.shouldFetch, false);
  });
});
