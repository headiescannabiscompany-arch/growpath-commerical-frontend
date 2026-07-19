import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FeedRail, { selectAds } from "@/components/feed/FeedRail";
import { recordCommercialAnalyticsEvent } from "@/api/commercialAnalytics";

const mockListCommercialFeedCampaigns = jest.fn();

jest.mock("@/api/commercialFeed", () => ({
  listCommercialFeedCampaigns: (...args: any[]) =>
    mockListCommercialFeedCampaigns(...args)
}));

jest.mock("@/api/commercialAnalytics", () => ({
  recordCommercialAnalyticsEvent: jest.fn(() => Promise.resolve({}))
}));

jest.mock("@/utils/photoUploads", () => ({
  resolveImageUri: (uri: string) => uri
}));

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => <View>{children}</View>;
});

describe("FeedRail", () => {
  beforeEach(() => {
    mockListCommercialFeedCampaigns.mockReset();
    jest.mocked(recordCommercialAnalyticsEvent).mockReset().mockResolvedValue({});
  });

  it("selects distinct top, middle, and bottom campaigns with multi-factor rotation", () => {
    const ads = [
      {
        title: "Newest",
        body: "New campaign",
        cta: "Open",
        href: "/new",
        createdAt: "2026-07-19T12:00:00Z",
        engagementCount: 2,
        clickCount: 8,
        promotionCount: 5,
        relevanceScore: 1,
        imageUrl: ""
      },
      {
        title: "Relevant",
        body: "Relevant campaign",
        cta: "Open",
        href: "/relevant",
        createdAt: "2026-07-18T12:00:00Z",
        engagementCount: 8,
        clickCount: 3,
        promotionCount: 2,
        relevanceScore: 10,
        imageUrl: ""
      },
      {
        title: "Underexposed",
        body: "Underexposed campaign",
        cta: "Open",
        href: "/underexposed",
        createdAt: "2026-07-17T12:00:00Z",
        engagementCount: 4,
        clickCount: 0,
        promotionCount: 0,
        relevanceScore: 4,
        imageUrl: ""
      }
    ];
    const selected = [
      selectAds(ads, 1, "top")[0],
      selectAds(ads, 1, "middle")[0],
      selectAds(ads, 1, "bottom")[0]
    ];

    expect(new Set(selected.map((item) => item.title)).size).toBe(3);
    expect(selected.map((item) => item.strategyLabel)).toEqual([
      "New & relevant",
      "Under-clicked",
      "Fresh placement"
    ]);
  });

  it("keeps fallback promotional cards on valid discovery routes", async () => {
    mockListCommercialFeedCampaigns.mockResolvedValue({ items: [], nextCursor: null });

    const screen = render(<FeedRail slots={1} railMode="promo-only" placement="top" />);

    await waitFor(() =>
      expect(screen.getByText("Explore grower storefronts")).toBeTruthy()
    );
    fireEvent.press(
      screen.getByLabelText("Browse storefronts for Explore grower storefronts")
    );

    expect(recordCommercialAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ad_click",
        objectType: "feed_ad",
        targetUrl: "/store",
        source: "feed_banner",
        metadata: expect.objectContaining({
          title: "Explore grower storefronts",
          cta: "Browse storefronts"
        })
      })
    );
    expect(recordCommercialAnalyticsEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ storefrontSlug: "living-soil-labs" })
    );
  });

  it("uses real feed campaigns when available and keeps Q&A links shared", async () => {
    mockListCommercialFeedCampaigns.mockResolvedValue({
      items: [
        {
          id: "campaign-qna",
          type: "education",
          title: "NPK workshop Q&A",
          body: "Ask questions before the live recipe workshop.",
          linkedForumThreadId: "thread-qna",
          createdAt: "2026-07-07T12:00:00Z",
          engagementCount: 4,
          author: { displayName: "Living Soil Labs" },
          tags: [],
          growInterests: ["living soil"]
        }
      ],
      nextCursor: null
    });

    const screen = render(<FeedRail slots={1} railMode="promo-only" placement="top" />);

    await waitFor(() => expect(screen.getByText("NPK workshop Q&A")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Open Forum Q&A for NPK workshop Q&A"));

    expect(mockListCommercialFeedCampaigns).toHaveBeenCalledWith({
      limit: 6,
      sort: "new"
    });
    expect(recordCommercialAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ad_click",
        objectType: "feed_ad",
        targetUrl: "/forum/post?id=thread-qna",
        source: "feed_banner",
        metadata: expect.objectContaining({
          title: "NPK workshop Q&A",
          cta: "Open Forum Q&A"
        })
      })
    );
  });

  it("keeps product campaign fallbacks on public discovery routes", async () => {
    mockListCommercialFeedCampaigns.mockResolvedValue({
      items: [
        {
          id: "campaign-product",
          type: "listing",
          title: "3-1-1 Veg Mix",
          body: "Promoted product discovery.",
          linkedProductId: "veg-mix-1",
          imageUrl: "https://example.com/generic.jpg",
          creativeImageUrl: "https://example.com/creative.jpg",
          bannerImageUrl: "https://example.com/banner.jpg",
          createdAt: "2026-07-07T12:00:00Z",
          engagementCount: 4,
          author: { displayName: "Living Soil Labs" },
          tags: [],
          growInterests: ["living soil"]
        }
      ],
      nextCursor: null
    });

    const screen = render(<FeedRail slots={1} railMode="promo-only" placement="top" />);

    await waitFor(() => expect(screen.getByText("3-1-1 Veg Mix")).toBeTruthy());
    expect(screen.getByLabelText("3-1-1 Veg Mix ad image").props.source).toEqual({
      uri: "https://example.com/banner.jpg"
    });
    fireEvent.press(screen.getByLabelText("View Product for 3-1-1 Veg Mix"));

    expect(recordCommercialAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ad_click",
        objectType: "feed_ad",
        targetUrl: "/store?q=veg-mix-1",
        source: "feed_banner",
        metadata: expect.objectContaining({
          title: "3-1-1 Veg Mix",
          cta: "View Product"
        })
      })
    );
    expect(recordCommercialAnalyticsEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        targetUrl: "/home/commercial/products/veg-mix-1"
      })
    );
  });

  it("routes product-line campaigns to filtered public storefront discovery", async () => {
    mockListCommercialFeedCampaigns.mockResolvedValue({
      items: [
        {
          id: "campaign-line",
          type: "listing",
          title: "Living Soil Line",
          body: "Browse the full product family.",
          linkedProductLineId: "line-1",
          storefrontSlug: "living-soil-labs",
          createdAt: "2026-07-07T12:00:00Z",
          engagementCount: 5,
          author: { displayName: "Living Soil Labs" },
          tags: [],
          growInterests: ["living soil"]
        }
      ],
      nextCursor: null
    });

    const screen = render(<FeedRail slots={1} railMode="promo-only" placement="top" />);

    await waitFor(() => expect(screen.getByText("Living Soil Line")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("View Product Line for Living Soil Line"));

    expect(recordCommercialAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ad_click",
        objectType: "feed_ad",
        targetUrl: "/store/living-soil-labs?line=line-1",
        source: "feed_banner",
        metadata: expect.objectContaining({
          title: "Living Soil Line",
          cta: "View Product Line"
        })
      })
    );
  });

  it("routes course and live campaigns to public destination surfaces", async () => {
    mockListCommercialFeedCampaigns.mockResolvedValue({
      items: [
        {
          id: "campaign-course",
          type: "education",
          title: "Soil Builder Masterclass",
          body: "Learn the full recipe workflow from a brand storefront.",
          linkedCourseId: "course-soil-1",
          storefrontSlug: "living-soil-labs",
          createdAt: "2026-07-07T12:00:00Z",
          engagementCount: 5,
          author: { displayName: "Living Soil Labs" },
          tags: [],
          growInterests: ["living soil"]
        },
        {
          id: "campaign-live",
          type: "drop",
          title: "Live Soil Mixing Demo",
          body: "RSVP to the public event.",
          linkedLiveId: "live-1",
          createdAt: "2026-07-07T13:00:00Z",
          engagementCount: 3,
          author: { displayName: "Living Soil Labs" },
          tags: [],
          growInterests: ["living soil"]
        }
      ],
      nextCursor: null
    });

    const screen = render(<FeedRail slots={2} railMode="promo-only" placement="top" />);

    await waitFor(() =>
      expect(screen.getByText("Soil Builder Masterclass")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("View Course for Soil Builder Masterclass"));
    fireEvent.press(screen.getByLabelText("View Live for Live Soil Mixing Demo"));

    expect(recordCommercialAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUrl: "/store/living-soil-labs/courses/course-soil-1",
        metadata: expect.objectContaining({ cta: "View Course" })
      })
    );
    expect(recordCommercialAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUrl: "/live-session?sessionId=live-1",
        metadata: expect.objectContaining({ cta: "View Live" })
      })
    );
  });

  it("preserves storefront slug aliases in promotional rail destinations", async () => {
    mockListCommercialFeedCampaigns.mockResolvedValue({
      items: [
        {
          id: "campaign-product-alias",
          type: "listing",
          title: "Alias Veg Mix",
          body: "Product campaign using a brand slug alias.",
          linkedProductId: "veg-mix-1",
          brandSlug: "soil-school",
          createdAt: "2026-07-07T12:00:00Z",
          engagementCount: 5,
          author: { displayName: "Soil School" },
          tags: [],
          growInterests: ["living soil"]
        },
        {
          id: "campaign-course-alias",
          type: "education",
          title: "Alias Course",
          body: "Course campaign using a public slug alias.",
          linkedCourseId: "course-1",
          publicSlug: "soil-school",
          createdAt: "2026-07-07T13:00:00Z",
          engagementCount: 3,
          author: { displayName: "Soil School" },
          tags: [],
          growInterests: ["education"]
        }
      ],
      nextCursor: null
    });

    const screen = render(<FeedRail slots={2} railMode="promo-only" placement="top" />);

    await waitFor(() => expect(screen.getByText("Alias Veg Mix")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("View Product for Alias Veg Mix"));
    fireEvent.press(screen.getByLabelText("View Course for Alias Course"));

    expect(recordCommercialAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUrl: "/store/soil-school/products/veg-mix-1",
        metadata: expect.objectContaining({ cta: "View Product" })
      })
    );
    expect(recordCommercialAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUrl: "/store/soil-school/courses/course-1",
        metadata: expect.objectContaining({ cta: "View Course" })
      })
    );
  });
});
