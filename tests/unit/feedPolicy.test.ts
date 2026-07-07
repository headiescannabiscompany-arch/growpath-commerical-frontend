import { getFeedBannerPolicy, getFeedPolicy } from "../../src/utils/feedPolicy";

describe("feedPolicy", () => {
  it("keeps the main page feed-heavy with promo placements", () => {
    const rail = getFeedPolicy({ routeKey: "home", plan: "free", mode: "personal" });
    const banner = getFeedBannerPolicy({
      routeKey: "home",
      plan: "free",
      mode: "personal",
      longContent: true
    });

    expect(rail.slots).toBe(2);
    expect(rail.includeForumHighlights).toBe(false);
    expect(rail.railMode).toBe("promo-only");
    expect(banner.top).toBe(true);
    expect(banner.middle).toBe(true);
    expect(banner.bottom).toBe(true);
    expect(banner.railMode).toBe("promo-only");
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
    expect(banner.railMode).toBe("promo-only");
  });

  it("adds top and bottom placements for short free pages", () => {
    const banner = getFeedBannerPolicy({
      routeKey: "short_page",
      plan: "free",
      mode: "personal",
      longContent: false
    });

    expect(banner.top).toBe(true);
    expect(banner.middle).toBe(false);
    expect(banner.bottom).toBe(true);
    expect(banner.slotsByPlacement.top).toBe(1);
    expect(banner.slotsByPlacement.middle).toBe(0);
    expect(banner.slotsByPlacement.bottom).toBe(1);
    expect(banner.railMode).toBe("promo-only");
  });
});
