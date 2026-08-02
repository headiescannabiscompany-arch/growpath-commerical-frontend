import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import AdCard from "@/components/feed/AdCard";
import { recordCommercialAnalyticsEvent } from "@/api/commercialAnalytics";

const mockFetchPublicStorefront = jest.fn();

jest.mock("@/api/commercialAnalytics", () => ({
  recordCommercialAnalyticsEvent: jest.fn(() => Promise.resolve({}))
}));

jest.mock("@/api/storefront", () => ({
  fetchPublicStorefront: (...args: any[]) => mockFetchPublicStorefront(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  resolveImageUri: (uri: string) => uri
}));

describe("AdCard", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("keeps selected campaign creative ahead of storefront fallback images", async () => {
    mockFetchPublicStorefront.mockResolvedValue({
      storefront: {
        bannerUrl: "https://example.com/storefront-banner.jpg"
      }
    });

    const screen = render(
      <AdCard
        title="Selected Campaign"
        body="Compact promoted copy."
        cta="Open"
        href="/store/selected"
        storefrontSlug="selected"
        imageUrl="https://example.com/campaign-banner.jpg"
      />
    );

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("selected")
    );
    expect(screen.getByLabelText("Selected Campaign ad image").props.source).toEqual({
      uri: "https://example.com/campaign-banner.jpg"
    });
    expect(
      StyleSheet.flatten(screen.getByText("Promoted campaign").props.style).color
    ).toBe("#C2410C");
    expect(StyleSheet.flatten(screen.getByText("Open →").props.style).color).toBe(
      "#C2410C"
    );
  });

  it("labels first-party shortcuts honestly and does not record campaign analytics", () => {
    const screen = render(
      <AdCard
        title="Explore grower storefronts"
        body="Browse published GrowPath brands."
        cta="Browse storefronts"
        href="/store"
        isFirstPartyShortcut
      />
    );

    fireEvent.press(
      screen.getByLabelText("Browse storefronts for Explore grower storefronts")
    );

    expect(screen.getByText("GrowPath shortcut")).toBeTruthy();
    expect(screen.queryByText("Promoted campaign")).toBeNull();
    expect(recordCommercialAnalyticsEvent).not.toHaveBeenCalled();
  });
});
