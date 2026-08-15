import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PublicBrandProfileRoute, {
  createStyles as createBrandProfileStyles
} from "@/app/brands/[slug]";
import PublicStorefrontRoute, {
  createStyles as createStorefrontStyles
} from "@/app/store/[slug]";
import PublicStorefrontAliasRoute from "@/app/storefront/[slug]";
import PublicProductRoute, {
  createStyles as createProductStyles
} from "@/app/store/[slug]/products/[productId]";
import PublicStorefrontProductAliasRoute from "@/app/storefront/[slug]/products/[productId]";
import PublicStorefrontCourseRoute, {
  createStyles as createCourseStyles
} from "@/app/store/[slug]/courses/[courseId]";
import PublicStorefrontCourseAliasRoute from "@/app/storefront/[slug]/courses/[courseId]";
import { getThemePalette } from "@/theme/appTheme";

const mockFetchPublicStorefront = jest.fn();
const mockCheckPublicProductAccess = jest.fn();
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
  const { Text, View } = require("react-native");
  return function MockAppPage({
    children,
    header,
    showBack = true,
    backFallbackHref
  }: any) {
    return React.createElement(
      View,
      null,
      showBack
        ? React.createElement(
            Text,
            { accessibilityRole: "link" },
            `Shared Back ${backFallbackHref}`
          )
        : null,
      header,
      children
    );
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppCard({ children }: any) {
    return React.createElement(View, null, children);
  };
});

jest.mock("@/api/storefront", () => ({
  fetchPublicStorefront: (...args: any[]) => mockFetchPublicStorefront(...args),
  checkPublicProductAccess: (...args: any[]) => mockCheckPublicProductAccess(...args)
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

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ isAuthed: true, user: { id: "viewer-1" } })
}));

jest.mock("@/components/ReportModal", () => () => null);

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
    bannerUrl: "https://example.com/living-soil-banner.jpg",
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
      imageUrl: "https://example.com/veg-mix.jpg",
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
      thumbnailUrl: "https://example.com/using-veg-mix-thumbnail.jpg",
      bannerUrl: "https://example.com/using-veg-mix-banner.jpg",
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
    mockCheckPublicProductAccess.mockReset();
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
    mockCheckPublicProductAccess.mockResolvedValue({
      allowed: false,
      decision: "review_required",
      message: "No approved handoff is available for this route."
    });
  });

  it("uses the active Night palette across public storefront routes", () => {
    const palette = getThemePalette("night", "light");
    const brandStyles = createBrandProfileStyles(palette);
    const storefrontStyles = createStorefrontStyles(palette);
    const productStyles = createProductStyles(palette);
    const courseStyles = createCourseStyles(palette);

    expect(brandStyles.title.color).toBe(palette.text);
    expect(brandStyles.feedback.backgroundColor).toBe(palette.surfaceMuted);
    expect(brandStyles.secondaryButton).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
    expect(brandStyles.primaryButton.backgroundColor).toBe(palette.accent);
    expect(brandStyles.statusPill.backgroundColor).toBe(palette.accentSoft);

    expect(storefrontStyles.product).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(storefrontStyles.profilePanel).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
    expect(storefrontStyles.button.backgroundColor).toBe(palette.accent);
    expect(storefrontStyles.warning.color).toBe(palette.warning);

    expect(productStyles.cardTitle.color).toBe(palette.text);
    expect(productStyles.feedback.backgroundColor).toBe(palette.surfaceMuted);
    expect(productStyles.specRow.borderColor).toBe(palette.border);
    expect(productStyles.primaryButton.backgroundColor).toBe(palette.accent);
    expect(productStyles.secondaryButton.backgroundColor).toBe(palette.surfaceMuted);
    expect(productStyles.linePanel.borderColor).toBe(palette.border);

    expect(courseStyles.error.color).toBe(palette.danger);
    expect(courseStyles.successTitle.color).toBe(palette.success);
    expect(courseStyles.canceledTitle.color).toBe(palette.warning);
    expect(courseStyles.statusPill.backgroundColor).toBe(palette.accentSoft);
    expect(courseStyles.primaryButton.backgroundColor).toBe(palette.info);
    expect(courseStyles.secondaryButton.backgroundColor).toBe(palette.surfaceMuted);
    expect(courseStyles.linkedRow.borderColor).toBe(palette.border);
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
    expect(mockLinkHrefs).toContain("/forum/post?id=thread-1");
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
    expect(mockLinkHrefs).toContain("/store/living-soil-labs/courses/course-1");
    expect(screen.getByText("Trial update")).toBeTruthy();
    expect(screen.getByText("Interests: living soil, product trials")).toBeTruthy();
    expect(screen.getByText("Promoted Campaigns")).toBeTruthy();
    expect(screen.getByText("Open Campaign")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/feed?campaignId=post-1");
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

  it("loads a public storefront with storefront-first profile copy", async () => {
    const screen = render(<PublicStorefrontRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(
      screen.getByLabelText("Living Soil Labs storefront image").props.source
    ).toEqual({ uri: "https://example.com/living-soil-banner.jpg" });
    expect(screen.getByText("Purpose-built soil and nutrient products.")).toBeTruthy();
    expect(screen.getByText("Storefront profile")).toBeTruthy();
    expect(screen.getByText("Open Legacy Profile")).toBeTruthy();
    expect(screen.getByText("Share Store")).toBeTruthy();
    expect(screen.getByText("View Similar Storefronts")).toBeTruthy();
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
    expect(screen.getByLabelText("Veg Mix image").props.source).toEqual({
      uri: "https://example.com/veg-mix.jpg"
    });
    expect(screen.getAllByText("Details").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Buy Veg Mix")).toBeTruthy();
    expect(screen.queryByLabelText("Buy Bloom Mix")).toBeNull();
    expect(
      screen.getByLabelText("Open external product External Clone Pack")
    ).toBeTruthy();
    expect(screen.getByText("Using Veg Mix")).toBeTruthy();
    expect(screen.getByLabelText("Using Veg Mix thumbnail").props.source).toEqual({
      uri: "https://example.com/using-veg-mix-thumbnail.jpg"
    });
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
    expect(mockLinkHrefs).toContain("/feed?campaignId=post-1");
    expect(screen.getByText("Veg Mix Trial")).toBeTruthy();
    expect(screen.getByText("Forum / Q&A")).toBeTruthy();
    expect(screen.getByText("Veg Mix Support")).toBeTruthy();
    expect(screen.getByText("Open Q&A")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/forum/post?id=thread-1");
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

  it("shows dispensary inventory with website and pickup handoff but no checkout", async () => {
    mockFetchPublicStorefront.mockResolvedValue({
      ...publicPayload,
      storefront: {
        name: "Example Dispensary",
        description: "Licensed adult-use dispensary.",
        storefrontType: "dispensary",
        city: "Boston",
        stateCode: "MA",
        websiteUrl: "https://dispensary.example.com/menu",
        pickupAvailable: true,
        pickupInstructions: "Bring a valid government-issued ID."
      },
      products: [
        {
          id: "flower-1",
          name: "Licensed Flower",
          category: "cannabis",
          regulatedCannabis: true,
          stripePriceId: "price_must_not_be_used",
          inventoryItem: { quantity: 8, unit: "jars" },
          externalPurchaseUrl: "https://dispensary.example.com/menu/flower",
          pickupAvailable: true
        }
      ]
    });
    const screen = render(<PublicStorefrontRoute />);

    await waitFor(() => expect(screen.getByText("Example Dispensary")).toBeTruthy());
    expect(screen.getByText("Boston, MA")).toBeTruthy();
    expect(screen.getByText("8 jars available")).toBeTruthy();
    expect(
      screen.getByText("In-store pickup available · Bring a valid government-issued ID.")
    ).toBeTruthy();
    expect(screen.queryByText("Dispensary Website")).toBeNull();
    expect(screen.getByText("Website")).toBeTruthy();
    expect(screen.queryByLabelText("Buy Licensed Flower")).toBeNull();
    expect(
      screen.getByText(/No GrowPath checkout .* open Details to check/)
    ).toBeTruthy();
  });

  it("loads the /storefront/:slug public alias through the same storefront route", async () => {
    const screen = render(<PublicStorefrontAliasRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(screen.getByText("Open Legacy Profile")).toBeTruthy();
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
    expect(screen.getByRole("header", { name: "Veg Mix" })).toHaveProp("aria-level", 1);
    expect(screen.getAllByText("Shared Back /store/living-soil-labs")).toHaveLength(1);
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
    expect(mockLinkHrefs).toContain("/forum/post?id=thread-1");
    expect(mockLinkHrefs).not.toContain("/home/personal/forum");
    expect(screen.getByText("Buy")).toBeTruthy();
    expect(screen.getByText("External Link")).toBeTruthy();
    expect(screen.getByText("Share Product")).toBeTruthy();
    expect(screen.getByText("Report Product")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Report Veg Mix" })).toBeTruthy();
    expect(screen.queryByText("Back to Store")).toBeNull();
    expect(screen.getByText("Legacy Profile")).toBeTruthy();
    expect(screen.getByText("Similar Storefronts")).toBeTruthy();
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

  it("keeps a semantic product heading and shared recovery path on load failure", async () => {
    mockFetchPublicStorefront.mockRejectedValueOnce(
      new Error("Product service unavailable")
    );

    const screen = render(<PublicProductRoute />);

    await waitFor(() =>
      expect(screen.getByText("Product service unavailable")).toBeTruthy()
    );
    expect(screen.getByRole("header", { name: "Product" })).toHaveProp("aria-level", 1);
    expect(screen.getAllByText("Shared Back /store/living-soil-labs")).toHaveLength(1);
    expect(screen.queryByText("Back to Store")).toBeNull();
  });

  it("loads the /storefront/:slug/products/:productId alias through the same product route", async () => {
    const screen = render(<PublicStorefrontProductAliasRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getAllByText("Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getByText("Label / Use Information")).toBeTruthy();
    expect(screen.getByText("Label N-P2O5-K2O")).toBeTruthy();
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

  it("keeps dispensary product detail external and inventory-only", async () => {
    mockRouteParams = {
      slug: "example-dispensary",
      productId: "flower-1",
      courseId: "course-1"
    };
    mockFetchPublicStorefront.mockResolvedValue({
      storefront: {
        name: "Example Dispensary",
        storefrontType: "dispensary",
        websiteUrl: "https://dispensary.example.com/menu",
        pickupAvailable: true,
        pickupInstructions: "Pickup during posted store hours."
      },
      products: [
        {
          id: "flower-1",
          name: "Licensed Flower",
          category: "cannabis",
          regulatedCannabis: true,
          stripePriceId: "price_must_not_be_used",
          inventoryCount: 4
        }
      ]
    });
    const screen = render(<PublicProductRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("example-dispensary")
    );
    expect(screen.getByText("4 units available")).toBeTruthy();
    expect(screen.getByText("Check legal purchase options")).toBeTruthy();
    expect(screen.queryByText("Dispensary Website")).toBeNull();
    expect(
      screen.getByText("In-store pickup available · Pickup during posted store hours.")
    ).toBeTruthy();
    expect(screen.queryByText("Buy")).toBeNull();
    expect(screen.getByText(/GrowPath does not verify licensing/)).toBeTruthy();
  });

  it("releases a regulated product handoff only after an exact reviewed route", async () => {
    mockRouteParams = {
      slug: "example-dispensary",
      productId: "flower-1",
      courseId: "course-1"
    };
    mockFetchPublicStorefront.mockResolvedValue({
      storefront: {
        name: "Example Dispensary",
        storefrontType: "dispensary",
        countryCode: "US"
      },
      products: [
        {
          id: "flower-1",
          name: "Licensed Flower",
          regulatedCannabis: true,
          regulatedProductClass: "regulated_cannabis_product",
          transactionAccess: "requires_exact_route_review"
        }
      ]
    });
    mockCheckPublicProductAccess.mockResolvedValueOnce({
      allowed: true,
      decision: "allowed",
      policyVersion: "2026-08-15",
      externalPurchaseUrl: "https://licensed.example.com/flower"
    });

    const screen = render(<PublicProductRoute />);
    await waitFor(() =>
      expect(screen.getAllByText("Licensed Flower").length).toBeGreaterThan(0)
    );
    expect(screen.queryByText("Continue to licensed provider")).toBeNull();

    fireEvent.changeText(screen.getByLabelText("Destination country code"), "us");
    fireEvent.changeText(
      screen.getByLabelText("Destination state or province code"),
      "ma"
    );
    fireEvent.press(screen.getByLabelText("Check approved product handoff"));

    await waitFor(() =>
      expect(mockCheckPublicProductAccess).toHaveBeenCalledWith("flower-1", {
        capability: "external_product_handoff",
        destination: { countryCode: "US", subdivisionCode: "MA" },
        buyerEligibility: "external_provider_verification_required",
        fulfillmentMethod: "external_handoff"
      })
    );
    expect(screen.getByText("Continue to licensed provider")).toBeTruthy();
    expect(
      screen.getByText(/licensed provider must still verify eligibility/i)
    ).toBeTruthy();
  });

  it("does not expose a regulated product URL when the route is not approved", async () => {
    mockRouteParams = {
      slug: "example-dispensary",
      productId: "flower-1",
      courseId: "course-1"
    };
    mockFetchPublicStorefront.mockResolvedValue({
      storefront: { name: "Example Dispensary", storefrontType: "dispensary" },
      products: [
        {
          id: "flower-1",
          name: "Licensed Flower",
          regulatedCannabis: true,
          transactionAccess: "requires_exact_route_review"
        }
      ]
    });

    const screen = render(<PublicProductRoute />);
    await waitFor(() =>
      expect(screen.getAllByText("Licensed Flower").length).toBeGreaterThan(0)
    );
    fireEvent.changeText(screen.getByLabelText("Destination country code"), "US");
    fireEvent.press(screen.getByLabelText("Check approved product handoff"));

    await waitFor(() =>
      expect(
        screen.getByText("No approved handoff is available for this route.")
      ).toBeTruthy()
    );
    expect(screen.queryByText("Continue to licensed provider")).toBeNull();
  });

  it("loads a public storefront course detail with checkout and connected context", async () => {
    const screen = render(<PublicStorefrontCourseRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getByRole("header", { name: "Using Veg Mix" })).toHaveProp(
      "aria-level",
      1
    );
    expect(screen.getAllByText("Shared Back /store/living-soil-labs")).toHaveLength(1);
    expect(screen.getAllByText("Using Veg Mix").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Using Veg Mix course image").props.source).toEqual({
      uri: "https://example.com/using-veg-mix-banner.jpg"
    });
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
    expect(mockLinkHrefs).toContain("/forum/post?id=thread-1");
    expect(screen.queryByText("Back to Store")).toBeNull();
    expect(screen.getByText("Legacy Profile")).toBeTruthy();
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

  it("keeps a semantic course heading and shared recovery path on load failure", async () => {
    mockFetchPublicStorefront.mockRejectedValueOnce(
      new Error("Course service unavailable")
    );

    const screen = render(<PublicStorefrontCourseRoute />);

    await waitFor(() =>
      expect(screen.getByText("Course service unavailable")).toBeTruthy()
    );
    expect(screen.getByRole("header", { name: "Course" })).toHaveProp("aria-level", 1);
    expect(screen.getAllByText("Shared Back /store/living-soil-labs")).toHaveLength(1);
    expect(screen.queryByText("Back to Store")).toBeNull();
  });

  it("turns a successful Stripe return into a clear course-unlock handoff", async () => {
    mockRouteParams = {
      slug: "living-soil-labs",
      courseId: "course-1",
      checkout: "success",
      course: "course-1"
    };
    const screen = render(<PublicStorefrontCourseRoute />);

    await waitFor(() => expect(screen.getByText("Payment submitted")).toBeTruthy());
    expect(screen.getByLabelText("Open purchased course")).toBeTruthy();
    expect(screen.getByText("Open Purchased Course")).toBeTruthy();
    expect(mockLinkHrefs).toContain(
      "/home/personal/courses?courseId=course-1&checkout=success"
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
