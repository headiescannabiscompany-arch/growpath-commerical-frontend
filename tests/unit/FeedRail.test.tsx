import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FeedRail from "@/components/feed/FeedRail";
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
    jest
      .mocked(recordCommercialAnalyticsEvent)
      .mockReset()
      .mockResolvedValue({});
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
        targetUrl: "/forum/post/thread-qna",
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
});
