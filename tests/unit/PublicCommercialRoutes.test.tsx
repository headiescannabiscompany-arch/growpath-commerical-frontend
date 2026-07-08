import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import PublicBrandProfileRoute from "@/app/brands/[slug]";
import PublicStorefrontRoute from "@/app/store/[slug]";
import PublicProductRoute from "@/app/store/[slug]/products/[productId]";

const mockFetchPublicStorefront = jest.fn();
const mockRecordCommercialAnalyticsEvent = jest.fn();
const mockLinkHrefs: string[] = [];

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) => {
      mockLinkHrefs.push(String(href));
      return React.createElement(React.Fragment, null, children);
    },
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
      unitSize: "5 lb bag",
      growInterests: ["living soil", "veg"],
      usageInstructions: "Topdress during veg and water in.",
      externalPurchaseUrl: "https://example.com/veg-mix",
      specs: {
        sourceTool: "dry-amendment-mix",
        npk: "3-1-1",
        guaranteedAnalysis: "N 3 / P2O5 1 / K2O 1",
        guaranteedAnalysisEstimate: { N: 3, P2O5: 1, K2O: 1 },
        elementalEstimate: { N: 3, P: 0.4364, K: 0.8301 },
        ingredients: ["Alfalfa meal", "Fish bone meal"],
        directions: "Topdress and water in.",
        applicationRate: "1 cup per cubic foot",
        releaseCurve: { summary: "fast nitrogen with slower phosphorus" },
        warnings: ["Estimated analysis; confirm final label and batch lot."]
      }
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
      summary: "A short setup course for the veg blend.",
      growInterests: ["living soil", "product education"],
      linkedProductIds: ["product-1"]
    }
  ],
  feedPosts: [
    {
      id: "post-1",
      title: "Trial update",
      summary: "Week three plants are pushing clean growth.",
      growInterests: ["living soil", "product trials"],
      linkedProductId: "product-1"
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
      summary: "Ask use-rate and topdress questions.",
      linkedProductId: "product-1"
    }
  ]
};

describe("public commercial routes", () => {
  beforeEach(() => {
    mockFetchPublicStorefront.mockReset();
    mockRecordCommercialAnalyticsEvent.mockReset();
    mockLinkHrefs.length = 0;
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
    expect(screen.getByText("Return to Campaigns")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/feed");
    expect(mockLinkHrefs).not.toContain("/home/personal/community");
    expect(screen.getByText("Website")).toBeTruthy();
    expect(screen.getByText("Support Email")).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getAllByText("Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Details").length).toBeGreaterThan(0);
    expect(screen.getByText("Using Veg Mix")).toBeTruthy();
    expect(screen.getByText("Trial update")).toBeTruthy();
    expect(screen.getByText("Promoted Campaigns")).toBeTruthy();
    expect(screen.getByText("Open Campaign")).toBeTruthy();
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
    expect(screen.getByText("Return to Campaigns")).toBeTruthy();
    expect(screen.getByText("Website")).toBeTruthy();
    expect(screen.getByText("Support Email")).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getAllByText("Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getByText("Interests: living soil, veg")).toBeTruthy();
    expect(screen.getByText("$25.00")).toBeTruthy();
    expect(screen.getAllByText("Details").length).toBeGreaterThan(0);
    expect(screen.getByText("Using Veg Mix")).toBeTruthy();
    expect(screen.getByText("Interests: living soil, product education")).toBeTruthy();
    expect(screen.getByText("Promoted Campaigns")).toBeTruthy();
    expect(screen.getByText("Trial update")).toBeTruthy();
    expect(screen.getByText("Interests: living soil, product trials")).toBeTruthy();
    expect(screen.getByText("Open Campaign")).toBeTruthy();
    expect(screen.getByText("Veg Mix Trial")).toBeTruthy();
    expect(screen.getByText("Forum / Q&A")).toBeTruthy();
    expect(screen.getByText("Veg Mix Support")).toBeTruthy();
    expect(screen.getByText("Open Q&A")).toBeTruthy();
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
    expect(screen.getByText("Label / Use Information")).toBeTruthy();
    expect(screen.getByText("dry-amendment-mix")).toBeTruthy();
    expect(screen.getByText("5 lb bag")).toBeTruthy();
    expect(screen.getByText("3-1-1")).toBeTruthy();
    expect(screen.getByText("N 3 / P2O5 1 / K2O 1")).toBeTruthy();
    expect(screen.getByText("N: 3, P2O5: 1, K2O: 1")).toBeTruthy();
    expect(screen.getByText("N: 3, P: 0.4364, K: 0.8301")).toBeTruthy();
    expect(screen.getByText("Alfalfa meal, Fish bone meal")).toBeTruthy();
    expect(screen.getAllByText("Topdress and water in.").length).toBeGreaterThan(0);
    expect(screen.getByText("1 cup per cubic foot")).toBeTruthy();
    expect(screen.getByText("fast nitrogen with slower phosphorus")).toBeTruthy();
    expect(
      screen.getByText("Estimated analysis; confirm final label and batch lot.")
    ).toBeTruthy();
    expect(screen.getByText("Related Courses")).toBeTruthy();
    expect(screen.getByText("Using Veg Mix")).toBeTruthy();
    expect(screen.getByText("Open Course")).toBeTruthy();
    expect(screen.getByText("Promoted Product Campaigns")).toBeTruthy();
    expect(screen.getByText("Trial update")).toBeTruthy();
    expect(screen.getAllByText("Open Campaign").length).toBeGreaterThan(0);
    expect(screen.getByText("Product Forum / Q&A")).toBeTruthy();
    expect(screen.getByText("Veg Mix Support")).toBeTruthy();
    expect(screen.getAllByText("Open Q&A").length).toBeGreaterThan(0);
    expect(screen.getByText("Buy")).toBeTruthy();
    expect(screen.getByText("External Link")).toBeTruthy();
    expect(screen.getByText("Share Product")).toBeTruthy();
    expect(screen.getByText("Back to Store")).toBeTruthy();
    expect(screen.getByText("Brand Profile")).toBeTruthy();
    expect(screen.getByText("Similar Brands")).toBeTruthy();
    expect(screen.getByText("Return to Campaigns")).toBeTruthy();
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
