import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import PublicBrandProfileRoute from "@/app/brands/[slug]";
import PublicStorefrontRoute from "@/app/store/[slug]";
import PublicProductRoute from "@/app/store/[slug]/products/[productId]";

const mockFetchPublicStorefront = jest.fn();
const mockRecordCommercialAnalyticsEvent = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useLocalSearchParams: () => ({ slug: "living-soil-labs", productId: "product-1" })
  };
});

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, header }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

jest.mock("@/api/storefront", () => ({
  fetchPublicStorefront: (...args: any[]) => mockFetchPublicStorefront(...args)
}));

jest.mock("@/api/products", () => ({
  checkoutProduct: jest.fn()
}));

jest.mock("@/api/commercialAnalytics", () => ({
  recordCommercialAnalyticsEvent: (...args: any[]) =>
    mockRecordCommercialAnalyticsEvent(...args)
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    mode: "personal",
    ready: true
  })
}));

const publicPayload = {
  storefront: {
    name: "Living Soil Labs",
    description: "Purpose-built soil and nutrient products.",
    websiteUrl: "https://example.com",
    supportEmail: "support@example.com",
    socialLinks: [{ label: "Instagram", url: "https://instagram.com/example" }]
  },
  products: [
    {
      id: "product-1",
      name: "Veg Mix",
      description: "Nitrogen-forward veg support.",
      priceCents: 2500,
      usageInstructions: "Topdress during veg and water in.",
      externalPurchaseUrl: "https://example.com/veg-mix"
    },
    {
      id: "product-2",
      name: "Bloom Mix",
      description: "Flower support.",
      priceCents: 3200
    }
  ],
  courses: [
    {
      id: "course-1",
      title: "Using Veg Mix",
      summary: "A short setup course for the veg blend."
    }
  ],
  feedPosts: [
    {
      id: "post-1",
      title: "Trial update",
      summary: "Week three plants are pushing clean growth."
    }
  ],
  trials: [
    {
      id: "trial-1",
      title: "Veg Mix Trial",
      summary: "Tracked vigor, pH stability, and response.",
      status: "active"
    }
  ],
  forumThreads: [
    {
      id: "thread-1",
      title: "Veg Mix Support",
      summary: "Ask use-rate and topdress questions."
    }
  ]
};

describe("public commercial routes", () => {
  beforeEach(() => {
    mockFetchPublicStorefront.mockReset();
    mockRecordCommercialAnalyticsEvent.mockReset();
    mockRecordCommercialAnalyticsEvent.mockResolvedValue({ success: true });
    mockFetchPublicStorefront.mockResolvedValue(publicPayload);
  });

  it("loads a public brand profile with a store link", async () => {
    const screen = render(<PublicBrandProfileRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(screen.getByText("Go to Store")).toBeTruthy();
    expect(screen.getByText("Share Profile")).toBeTruthy();
    expect(screen.getByText("View Similar Brands")).toBeTruthy();
    expect(screen.getByText("Return to Feed")).toBeTruthy();
    expect(screen.getByText("Website")).toBeTruthy();
    expect(screen.getByText("Support Email")).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getAllByText("Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Details").length).toBeGreaterThan(0);
    expect(screen.getByText("Using Veg Mix")).toBeTruthy();
    expect(screen.getByText("Trial update")).toBeTruthy();
    expect(screen.getByText("Veg Mix Trial")).toBeTruthy();
    expect(screen.getByText("Veg Mix Support")).toBeTruthy();
    await waitFor(() =>
      expect(mockRecordCommercialAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "brand_profile_view",
          storefrontSlug: "living-soil-labs",
          source: "public_brand_profile"
        })
      )
    );
  });

  it("loads a public storefront with a brand profile link", async () => {
    const screen = render(<PublicStorefrontRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(screen.getByText("View Brand Profile")).toBeTruthy();
    expect(screen.getByText("Share Store")).toBeTruthy();
    expect(screen.getByText("View Similar Brands")).toBeTruthy();
    expect(screen.getByText("Return to Feed")).toBeTruthy();
    expect(screen.getByText("Website")).toBeTruthy();
    expect(screen.getByText("Support Email")).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getAllByText("Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getByText("$25.00")).toBeTruthy();
    expect(screen.getAllByText("Details").length).toBeGreaterThan(0);
    expect(screen.getByText("Using Veg Mix")).toBeTruthy();
    expect(screen.getByText("Veg Mix Trial")).toBeTruthy();
    await waitFor(() =>
      expect(mockRecordCommercialAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "storefront_view",
          storefrontSlug: "living-soil-labs",
          source: "public_storefront"
        })
      )
    );
  });

  it("loads a public product detail page with storefront navigation", async () => {
    const screen = render(<PublicProductRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getAllByText("Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(screen.getByText("Topdress during veg and water in.")).toBeTruthy();
    expect(screen.getByText("Buy")).toBeTruthy();
    expect(screen.getByText("External Link")).toBeTruthy();
    expect(screen.getByText("Share Product")).toBeTruthy();
    expect(screen.getByText("Back to Store")).toBeTruthy();
    expect(screen.getByText("Brand Profile")).toBeTruthy();
    expect(screen.getByText("Similar Brands")).toBeTruthy();
    expect(screen.getByText("Return to Feed")).toBeTruthy();
    expect(screen.getByText("Website")).toBeTruthy();
    expect(screen.getByText("Support Email")).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getByText("Bloom Mix")).toBeTruthy();
    await waitFor(() =>
      expect(mockRecordCommercialAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "product_view",
          productId: "product-1",
          storefrontSlug: "living-soil-labs",
          source: "public_product"
        })
      )
    );
  });
});
