import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PublicBrandProfileRoute from "@/app/brands/[slug]";
import PublicStorefrontRoute from "@/app/store/[slug]";
import PublicStorefrontAliasRoute from "@/app/storefront/[slug]";
import PublicProductRoute from "@/app/store/[slug]/products/[productId]";
import PublicStorefrontProductAliasRoute from "@/app/storefront/[slug]/products/[productId]";
import PublicStorefrontCourseRoute from "@/app/store/[slug]/courses/[courseId]";
import PublicStorefrontCourseAliasRoute from "@/app/storefront/[slug]/courses/[courseId]";

const mockFetchPublicStorefront = jest.fn();
const mockRecordCommercialAnalyticsEvent = jest.fn();
const mockStartCourseCheckout = jest.fn();
const mockLinkHrefs: string[] = [];
let mockRouteParams: Record<string, string> = {
  slug: "living-soil-labs",
  productId: "product-1",
  courseId: "course-1"
};

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) => {
      mockLinkHrefs.push(String(href));
      return React.createElement(React.Fragment, null, children);
    },
    useLocalSearchParams: () => mockRouteParams
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

jest.mock("@/api/coursePayments", () => ({
  startCourseCheckout: (...args: any[]) => mockStartCourseCheckout(...args)
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
    growInterests: ["living soil", "dry amendments"],
    socialLinks: [{ label: "Instagram", url: "https://instagram.com/example" }]
  },
  products: [
    {
      id: "product-1",
      name: "Veg Mix",
      description: "Nitrogen-forward veg support.",
      priceCents: 2500,
      productLineId: "line-1",
      unitSize: "5 lb bag",
      growInterests: ["living soil", "veg"],
      usageInstructions: "Topdress during veg and water in.",
      externalPurchaseUrl: "https://example.com/veg-mix",
      stripePriceId: "price_product_1",
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
      priceCents: 3200,
      productLineId: "line-2"
    },
    {
      id: "product-3",
      name: "External Clone Pack",
      description: "External preorder listing.",
      priceCents: 4200,
      productLineId: "line-2",
      externalPurchaseUrl: "https://example.com/clones"
    }
  ],
  productLines: [
    {
      id: "line-1",
      name: "Living Soil Line",
      publicSummary: "Base soils and dry amendments by stage.",
      growInterests: ["living soil", "dry amendments"]
    }
  ],
  courses: [
    {
      id: "course-1",
      title: "Using Veg Mix",
      summary: "A short setup course for the veg blend.",
      growInterests: ["living soil", "product education"],
      linkedProductIds: ["product-1"],
      access: "paid",
      price: 29,
      stripePriceId: "price_course_1",
      skillLevel: "Beginner",
      moduleCount: 2,
      lessonCount: 5,
      documentCount: 1,
      videoCount: 3
    }
  ],
  lives: [
    {
      id: "live-1",
      title: "Veg Mix Live Demo",
      description: "Walk through the course recipe and product application.",
      relatedCourseId: "course-1",
      relatedProductId: "product-1",
      scheduledStart: "2026-08-01T18:00:00.000Z"
    }
  ],
  liveEvents: [
    {
      id: "live-1",
      title: "Veg Mix Live Demo",
      description: "Walk through the course recipe and product application.",
      relatedCourseId: "course-1",
      relatedProductId: "product-1",
      scheduledStart: "2026-08-01T18:00:00.000Z"
    }
  ],
  feedPosts: [
    {
      id: "post-1",
      title: "Trial update",
      summary: "Week three plants are pushing clean growth.",
      growInterests: ["living soil", "product trials"],
      linkedProductId: "product-1",
      linkedCourseId: "course-1"
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
      linkedProductId: "product-1",
      linkedCourseId: "course-1"
    }
  ]
};

describe("public commercial routes", () => {
  beforeEach(() => {
    mockFetchPublicStorefront.mockReset();
    mockRecordCommercialAnalyticsEvent.mockReset();
    mockStartCourseCheckout.mockReset();
    mockLinkHrefs.length = 0;
    mockRouteParams = {
      slug: "living-soil-labs",
      productId: "product-1",
      courseId: "course-1"
    };
    mockRecordCommercialAnalyticsEvent.mockResolvedValue({ success: true });
    mockStartCourseCheckout.mockResolvedValue({});
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
    expect(mockLinkHrefs).toContain("/forum/post/thread-1");
    expect(mockLinkHrefs).not.toContain("/home/personal/community");
    expect(mockLinkHrefs).not.toContain("/home/personal/forum");
    expect(screen.getByText("Website")).toBeTruthy();
    expect(screen.getByText("Support Email")).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getByText("Product Lines")).toBeTruthy();
    expect(screen.getByText("Living Soil Line")).toBeTruthy();
    expect(screen.getByText("Interests: living soil, dry amendments")).toBeTruthy();
    expect(screen.getByText("Browse Line")).toBeTruthy();
    expect(screen.getAllByText("Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getByText("Interests: living soil, veg")).toBeTruthy();
    expect(screen.getAllByText("Details").length).toBeGreaterThan(0);
    expect(screen.getByText("Using Veg Mix")).toBeTruthy();
    expect(screen.getByText("Interests: living soil, product education")).toBeTruthy();
    expect(screen.getByText("Trial update")).toBeTruthy();
    expect(screen.getByText("Interests: living soil, product trials")).toBeTruthy();
    expect(screen.getByText("Promoted Campaigns")).toBeTruthy();
    expect(screen.getByText("Open Campaign")).toBeTruthy();
    expect(screen.getByText("Veg Mix Trial")).toBeTruthy();
    expect(screen.getByText("Veg Mix Support")).toBeTruthy();
    await waitFor(() =>
      expect(mockRecordCommercialAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "brand_profile_view",
          storefrontSlug: "living-soil-labs",
          source: "public_brand_profile",
          metadata: { growInterests: ["living soil", "dry amendments"] }
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
    expect(screen.getByText("Product Lines")).toBeTruthy();
    expect(screen.getByText("Living Soil Line")).toBeTruthy();
    expect(screen.getByText("Browse Line")).toBeTruthy();
    expect(screen.getAllByText("Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getByText("Interests: living soil, veg")).toBeTruthy();
    expect(screen.getByText("$25.00")).toBeTruthy();
    expect(screen.getAllByText("Details").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Buy Veg Mix")).toBeTruthy();
    expect(screen.queryByLabelText("Buy Bloom Mix")).toBeNull();
    expect(
      screen.getByLabelText("Open external product External Clone Pack")
    ).toBeTruthy();
    expect(screen.getByText("Using Veg Mix")).toBeTruthy();
    expect(screen.getByText("Interests: living soil, product education")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/store/living-soil-labs/courses/course-1");
    expect(screen.getByText("Upcoming Lives")).toBeTruthy();
    expect(screen.getByText("Veg Mix Live Demo")).toBeTruthy();
    expect(screen.getByText("Open Live")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/live-session?sessionId=live-1");
    expect(screen.getByText("Promoted Campaigns")).toBeTruthy();
    expect(screen.getByText("Trial update")).toBeTruthy();
    expect(screen.getByText("Interests: living soil, product trials")).toBeTruthy();
    expect(screen.getByText("Open Campaign")).toBeTruthy();
    expect(screen.getByText("Veg Mix Trial")).toBeTruthy();
    expect(screen.getByText("Forum / Q&A")).toBeTruthy();
    expect(screen.getByText("Veg Mix Support")).toBeTruthy();
    expect(screen.getByText("Open Q&A")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/forum/post/thread-1");
    expect(mockLinkHrefs).not.toContain("/home/personal/forum");
    await waitFor(() =>
      expect(mockRecordCommercialAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "storefront_view",
          storefrontSlug: "living-soil-labs",
          source: "public_storefront",
          metadata: { growInterests: ["living soil", "dry amendments"] }
        })
      )
    );
  });

  it("loads the /storefront/:slug public alias through the same storefront route", async () => {
    const screen = render(<PublicStorefrontAliasRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(screen.getByText("View Brand Profile")).toBeTruthy();
    expect(screen.getByText("Promoted Campaigns")).toBeTruthy();
    expect(screen.getByText("Upcoming Lives")).toBeTruthy();
    expect(screen.getByText("Forum / Q&A")).toBeTruthy();
  });

  it("filters public storefront products by product line query", async () => {
    mockRouteParams = {
      slug: "living-soil-labs",
      productId: "product-1",
      line: "line-1"
    };
    const screen = render(<PublicStorefrontRoute />);

    await waitFor(() => expect(screen.getByText("Filtered Product Line")).toBeTruthy());

    expect(screen.getByText("Showing products linked to line-1.")).toBeTruthy();
    expect(screen.getByText("View All Products")).toBeTruthy();
    expect(screen.getAllByText("Veg Mix").length).toBeGreaterThan(0);
    expect(screen.queryByText("Bloom Mix")).toBeNull();
  });

  it("loads a public product detail page with storefront navigation", async () => {
    const screen = render(<PublicProductRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getAllByText("Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getByText("Interests: living soil, veg")).toBeTruthy();
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
    expect(screen.getByText("Product Line")).toBeTruthy();
    expect(screen.getByText("Living Soil Line")).toBeTruthy();
    expect(screen.getByText("Base soils and dry amendments by stage.")).toBeTruthy();
    expect(
      screen.getAllByText("Interests: living soil, dry amendments").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Browse Line")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/store/living-soil-labs?line=line-1");
    expect(screen.getByText("1 cup per cubic foot")).toBeTruthy();
    expect(screen.getByText("fast nitrogen with slower phosphorus")).toBeTruthy();
    expect(
      screen.getByText("Estimated analysis; confirm final label and batch lot.")
    ).toBeTruthy();
    expect(screen.getByText("Related Courses")).toBeTruthy();
    expect(screen.getByText("Using Veg Mix")).toBeTruthy();
    expect(screen.getByText("Interests: living soil, product education")).toBeTruthy();
    expect(screen.getByText("Open Course")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/store/living-soil-labs/courses/course-1");
    expect(screen.getByText("Product Lives")).toBeTruthy();
    expect(screen.getByText("Veg Mix Live Demo")).toBeTruthy();
    expect(screen.getByText("Open Live")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/live-session?sessionId=live-1");
    expect(screen.getByText("Promoted Product Campaigns")).toBeTruthy();
    expect(screen.getByText("Trial update")).toBeTruthy();
    expect(screen.getByText("Interests: living soil, product trials")).toBeTruthy();
    expect(screen.getAllByText("Open Campaign").length).toBeGreaterThan(0);
    expect(mockLinkHrefs).toContain("/feed?campaignId=post-1");
    expect(screen.getByText("Product Forum / Q&A")).toBeTruthy();
    expect(screen.getByText("Veg Mix Support")).toBeTruthy();
    expect(screen.getAllByText("Open Q&A").length).toBeGreaterThan(0);
    expect(mockLinkHrefs).toContain("/forum/post/thread-1");
    expect(mockLinkHrefs).not.toContain("/home/personal/forum");
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
          source: "public_product",
          metadata: { growInterests: ["living soil", "veg"] }
        })
      )
    );
  });

  it("loads the /storefront/:slug/products/:productId alias through the same product route", async () => {
    const screen = render(<PublicStorefrontProductAliasRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getAllByText("Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getByText("Label / Use Information")).toBeTruthy();
    expect(screen.getByText("Product Forum / Q&A")).toBeTruthy();
    expect(screen.getByText("Buy")).toBeTruthy();
  });

  it("does not show a fake product checkout when no Stripe or external link exists", async () => {
    mockRouteParams = {
      slug: "living-soil-labs",
      productId: "product-2",
      courseId: "course-1"
    };
    const screen = render(<PublicProductRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getAllByText("Bloom Mix").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Buy Bloom Mix")).toBeNull();
    expect(screen.queryByLabelText("Open external product Bloom Mix")).toBeNull();
    expect(screen.getByText("Checkout is not available for this product.")).toBeTruthy();
  });

  it("shows external product CTA instead of Stripe checkout for external-only products", async () => {
    mockRouteParams = {
      slug: "living-soil-labs",
      productId: "product-3",
      courseId: "course-1"
    };
    const screen = render(<PublicProductRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getAllByText("External Clone Pack").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Buy External Clone Pack")).toBeNull();
    expect(
      screen.getByLabelText("Open external product External Clone Pack")
    ).toBeTruthy();
    expect(screen.getByText("External Link")).toBeTruthy();
  });

  it("loads a public storefront course detail with checkout and connected context", async () => {
    const screen = render(<PublicStorefrontCourseRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getAllByText("Using Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(screen.getByText("A short setup course for the veg blend.")).toBeTruthy();
    expect(screen.getByText("Interests: living soil, product education")).toBeTruthy();
    expect(screen.getByText("$29.00")).toBeTruthy();
    expect(screen.getByText("Beginner")).toBeTruthy();
    expect(screen.getByText("Paid course")).toBeTruthy();
    expect(screen.getByText("Course Includes")).toBeTruthy();
    expect(screen.getByText("Modules")).toBeTruthy();
    expect(screen.getByText("Lessons")).toBeTruthy();
    expect(screen.getByText("Related Products")).toBeTruthy();
    expect(screen.getByText("Veg Mix")).toBeTruthy();
    expect(screen.getByText("View Product")).toBeTruthy();
    expect(screen.getByText("Related Lives")).toBeTruthy();
    expect(screen.getByText("Veg Mix Live Demo")).toBeTruthy();
    expect(screen.getByText("Open Live")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/live-session?sessionId=live-1");
    expect(screen.getByText("Promoted Course Campaigns")).toBeTruthy();
    expect(screen.getAllByText("Trial update").length).toBeGreaterThan(0);
    expect(screen.getByText("Open Campaign")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/feed?campaignId=post-1");
    expect(screen.getByText("Course Forum / Q&A")).toBeTruthy();
    expect(screen.getByText("Veg Mix Support")).toBeTruthy();
    expect(screen.getByText("Open Q&A")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/forum/post/thread-1");
    expect(screen.getByText("Back to Store")).toBeTruthy();
    expect(screen.getByText("Brand Profile")).toBeTruthy();
    expect(screen.getByText("Course Directory")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Buy storefront course"));

    await waitFor(() =>
      expect(mockStartCourseCheckout).toHaveBeenCalledWith("course-1", {
        returnPath: "/store/living-soil-labs/courses/course-1"
      })
    );
    await waitFor(() =>
      expect(mockRecordCommercialAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "course_view",
          courseId: "course-1",
          storefrontSlug: "living-soil-labs",
          source: "public_storefront_course"
        })
      )
    );
    expect(mockRecordCommercialAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "course_checkout_click",
        courseId: "course-1",
        storefrontSlug: "living-soil-labs",
        source: "public_storefront_course"
      })
    );
  });

  it("loads the /storefront/:slug/courses/:courseId alias through the same course route", async () => {
    const screen = render(<PublicStorefrontCourseAliasRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getAllByText("Using Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getByText("Buy Course")).toBeTruthy();
    expect(screen.getByText("Related Products")).toBeTruthy();
    expect(screen.getByText("Course Forum / Q&A")).toBeTruthy();
  });
});
