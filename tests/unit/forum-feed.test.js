// Jest-compatible version

import { describe, it, expect } from "@jest/globals";

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
    expect(decision.shouldFetch).toBe(true);
    expect(decision.nextLastCount).toBe(5);
  });

  it("stops when new page produced no additional posts", () => {
    const decision = shouldAutoFetchMore({
      ...baseArgs,
      filteredCount: 3,
      lastFilteredCount: 5
    });
    expect(decision.shouldFetch).toBe(false);
    expect(decision.nextLastCount).toBe(3);
  });

  it("stops when filtered list already has at least one full page", () => {
    const decision = shouldAutoFetchMore({
      ...baseArgs,
      filteredCount: 20,
      lastFilteredCount: 10
    });
    expect(decision.shouldFetch).toBe(false);
  });

  it("stops when backend has no additional pages", () => {
    const decision = shouldAutoFetchMore({
      ...baseArgs,
      filteredCount: 5,
      lastFilteredCount: 2,
      hasNextPage: false
    });
    expect(decision.shouldFetch).toBe(false);
  });

  it("stops when already fetching", () => {
    const decision = shouldAutoFetchMore({
      ...baseArgs,
      filteredCount: 5,
      lastFilteredCount: 2,
      isFetching: true
    });
    expect(decision.shouldFetch).toBe(false);
  });
});
