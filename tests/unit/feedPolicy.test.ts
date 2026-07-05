import { getFeedBannerPolicy, getFeedPolicy } from "../../src/utils/feedPolicy";

describe("feedPolicy", () => {
  it("keeps the main free personal landing page free of side feed rails", () => {
    const rail = getFeedPolicy({ routeKey: "home", plan: "free", mode: "personal" });
    const banner = getFeedBannerPolicy({
      routeKey: "home",
      plan: "free",
      mode: "personal",
      longContent: true
    });

    expect(rail.slots).toBe(0);
    expect(rail.includeForumHighlights).toBe(false);
    expect(banner.top).toBe(false);
    expect(banner.middle).toBe(false);
    expect(banner.bottom).toBe(false);
  });

  it("shows a top banner for non-home paid pages", () => {
    const banner = getFeedBannerPolicy({
      routeKey: "profile",
      plan: "pro",
      mode: "personal",
      longContent: true
    });

    expect(banner.top).toBe(true);
    expect(banner.middle).toBe(false);
    expect(banner.bottom).toBe(false);
    expect(banner.slotsByPlacement.top).toBe(1);
  });

  it("adds top, middle, and bottom placements for long free pages", () => {
    const banner = getFeedBannerPolicy({
      routeKey: "personal_tools_hub",
      plan: "free",
      mode: "personal",
      longContent: true
    });

    expect(banner.top).toBe(true);
    expect(banner.middle).toBe(true);
    expect(banner.bottom).toBe(true);
    expect(banner.slotsByPlacement.middle).toBe(1);
    expect(banner.slotsByPlacement.bottom).toBe(1);
  });

  it("omits all banner placements for short free pages", () => {
    const banner = getFeedBannerPolicy({
      routeKey: "short_page",
      plan: "free",
      mode: "personal",
      longContent: false
    });

    expect(banner.top).toBe(false);
    expect(banner.middle).toBe(false);
    expect(banner.bottom).toBe(false);
    expect(banner.slotsByPlacement.top).toBe(0);
    expect(banner.slotsByPlacement.middle).toBe(0);
    expect(banner.slotsByPlacement.bottom).toBe(0);
  });
});
