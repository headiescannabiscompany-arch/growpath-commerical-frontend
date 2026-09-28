import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
const mockPollCourseAccessStatus = jest.fn();
const mockSubmitProductPurchaseIntent = jest.fn();
const mockGetProductPurchaseStatus = jest.fn();
const mockRequestProductRefund = jest.fn();
const mockReportProductPaymentIssue = jest.fn();
const mockUseAuth = jest.fn();
const mockRouterPush = jest.fn();
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
    useLocalSearchParams: () => mockRouteParams,
    useRouter: () => ({ push: mockRouterPush })
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
  checkoutProduct: jest.fn(),
  getProductPurchaseStatus: (...args: any[]) => mockGetProductPurchaseStatus(...args),
  reportProductPaymentIssue: (...args: any[]) => mockReportProductPaymentIssue(...args),
  requestProductRefund: (...args: any[]) => mockRequestProductRefund(...args),
  submitProductPurchaseIntent: (...args: any[]) =>
    mockSubmitProductPurchaseIntent(...args)
}));

jest.mock("@/api/coursePayments", () => ({
  pollCourseAccessStatus: (...args: any[]) => mockPollCourseAccessStatus(...args),
  startCourseCheckout: (...args: any[]) => mockStartCourseCheckout(...args)
}));

jest.mock("@/api/commercialAnalytics", () => ({
  recordCommercialAnalyticsEvent: (...args: any[]) =>
    mockRecordCommercialAnalyticsEvent(...args)
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
  useOptionalAuth: () => mockUseAuth()
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
      socialPreviewUrl:
        "https://api.growpathai.com/api/commercial/storefront/public/living-soil-labs/products/product-1/share?v=abc123",
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
  videos: [
    {
      id: "video-1",
      title: "Build a soil bed",
      description: "A public storefront video.",
      thumbnailUrl: "https://example.com/soil-bed.jpg",
      durationSeconds: 305,
      visibility: "public"
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

const paidProductPurchaseStatus = {
  productId: "product-1",
  recordId: "507f191e810c19729de86001",
  amountCents: 2500,
  currency: "usd",
  paymentStatus: "paid",
  checkoutStatus: "completed",
  fulfillmentStatus: "unfulfilled",
  refundStatus: "none",
  refundLifecycleStatus: "none",
  refundRequestStatus: "none",
  refundedAmountCents: 0,
  disputeStatus: "none",
  providerDisputeStatus: "none",
  disputeReportStatus: "none",
  connectRecoveryStatus: "not_attempted",
  inventoryStatus: "applied",
  accountingStatus: "applied"
};

describe("public commercial routes", () => {
  beforeEach(() => {
    mockFetchPublicStorefront.mockReset();
    mockCheckPublicProductAccess.mockReset();
    mockRecordCommercialAnalyticsEvent.mockReset();
    mockStartCourseCheckout.mockReset();
    mockPollCourseAccessStatus.mockReset();
    mockSubmitProductPurchaseIntent.mockReset();
    mockGetProductPurchaseStatus.mockReset();
    mockRequestProductRefund.mockReset();
    mockReportProductPaymentIssue.mockReset();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      isAuthed: true,
      isHydrating: false,
      user: { id: "viewer-1" }
    });
    mockRouterPush.mockReset();
    jest.requireMock("@/api/products").checkoutProduct.mockReset();
    mockLinkHrefs.length = 0;
    mockRouteParams = {
      slug: "living-soil-labs",
      productId: "product-1",
      courseId: "course-1"
    };
    mockRecordCommercialAnalyticsEvent.mockResolvedValue({ success: true });
    mockStartCourseCheckout.mockResolvedValue({});
    mockPollCourseAccessStatus.mockResolvedValue({
      attempts: 1,
      snapshot: { enrolled: true, paymentStatus: "paid" },
      state: "confirmed"
    });
    mockSubmitProductPurchaseIntent.mockResolvedValue({
      response: "yes",
      summary: { yes: 5, maybe: 2, no: 1, total: 8 }
    });
    mockGetProductPurchaseStatus.mockImplementation(() => new Promise(() => {}));
    mockRequestProductRefund.mockResolvedValue({
      accepted: true,
      message: "Refund request recorded for GrowPath payment review."
    });
    mockReportProductPaymentIssue.mockResolvedValue({ accepted: true });
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
    expect(screen.getByRole("header", { name: "Living Soil Labs" })).toHaveProp(
      "aria-level",
      1
    );
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
    expect(screen.getByText("Videos")).toBeTruthy();
    expect(screen.getByText("Build a soil bed")).toBeTruthy();
    expect(screen.getByText("5 min")).toBeTruthy();
    expect(screen.getByLabelText("Build a soil bed thumbnail").props.source).toEqual({
      uri: "https://example.com/soil-bed.jpg"
    });
    expect(screen.getByText("Watch Video")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/videos/video-1");
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

  describe("ordinary storefront card Buy sign-in return", () => {
    const savedProductId = "507f191e810c19729de86001";
    const savedStorefront = { ...publicPayload.storefront, slug: "living-soil-labs" };
    const savedProduct = { ...publicPayload.products[0], id: savedProductId };
    const loginPath = `/login?next=${encodeURIComponent(
      `/store/living-soil-labs/products/${savedProductId}`
    )}`;

    function expectNoCheckout() {
      expect(jest.requireMock("@/api/products").checkoutProduct).not.toHaveBeenCalled();
      expect(mockRecordCommercialAnalyticsEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ eventType: "product_checkout_click" })
      );
      expect(mockSubmitProductPurchaseIntent).not.toHaveBeenCalled();
    }

    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isAuthed: false, isHydrating: false, user: null });
      mockRouteParams = { slug: "requested-store-alias" };
      mockFetchPublicStorefront.mockResolvedValue({
        ...publicPayload,
        storefront: savedStorefront,
        products: [savedProduct]
      });
    });

    it.each(["id", "_id", "productId"])(
      "returns signed-out Buy to the canonical detail using stored %s, not aliases",
      async (field: string) => {
        mockFetchPublicStorefront.mockResolvedValue({
          ...publicPayload,
          storefront: savedStorefront,
          products: [
            { ...savedProduct, id: undefined, [field]: savedProductId, slug: "veg-mix" }
          ]
        });
        const screen = render(<PublicStorefrontRoute />);
        const buy = await screen.findByRole("button", { name: "Buy Veg Mix" });
        expectNoCheckout();
        expect(mockRouterPush).not.toHaveBeenCalled();
        fireEvent.press(buy);

        expect(mockRouterPush).toHaveBeenCalledTimes(1);
        expect(mockRouterPush).toHaveBeenCalledWith(loginPath);
        expectNoCheckout();
      }
    );

    it.each([
      ["missing stored slug", undefined, savedProductId],
      ["array product id", "living-soil-labs", [savedProductId]]
    ])(
      "uses plain sign-in for %s without making a checkout",
      async (_case: unknown, savedSlug: unknown, savedId: unknown) => {
        mockFetchPublicStorefront.mockResolvedValue({
          ...publicPayload,
          storefront: { ...savedStorefront, slug: savedSlug },
          products: [{ ...savedProduct, id: savedId }]
        });
        const screen = render(<PublicStorefrontRoute />);
        fireEvent.press(await screen.findByRole("button", { name: "Buy Veg Mix" }));

        expect(mockRouterPush).toHaveBeenCalledWith("/login");
        expectNoCheckout();
      }
    );

    it.each([false, true])(
      "blocks the card Buy handler during hydration when isAuthed is %s",
      async (isAuthed: boolean) => {
        mockUseAuth.mockReturnValue({ isAuthed, isHydrating: true, user: null });
        const screen = render(<PublicStorefrontRoute />);
        const buy = await screen.findByRole("button", { name: "Buy Veg Mix" });
        expect(buy).toBeDisabled();
        expect(buy).toHaveProp("accessibilityState", { disabled: true, busy: false });
        fireEvent.press(buy);
        const handler = screen.UNSAFE_root.findAll(
          (node: { props: { accessibilityLabel?: string; onPress?: unknown } }) =>
            node.props.accessibilityLabel === "Buy Veg Mix" &&
            typeof node.props.onPress === "function"
        )[0].props.onPress;
        await act(async () => handler());

        expect(mockRouterPush).not.toHaveBeenCalled();
        expectNoCheckout();
      }
    );

    it("requires a fresh card Buy after login and keeps the signed-in storefront return", async () => {
      const checkout = jest.requireMock("@/api/products").checkoutProduct;
      checkout.mockResolvedValue({ url: "https://checkout.example.com/session" });
      const openUrlSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
      const screen = render(<PublicStorefrontRoute />);
      fireEvent.press(await screen.findByRole("button", { name: "Buy Veg Mix" }));
      expect(mockRouterPush).toHaveBeenCalledWith(loginPath);

      mockUseAuth.mockReturnValue({
        isAuthed: true,
        isHydrating: false,
        user: { id: "viewer-1" }
      });
      screen.rerender(<PublicStorefrontRoute />);
      expectNoCheckout();
      expect(mockRouterPush).toHaveBeenCalledTimes(1);
      fireEvent.press(screen.getByRole("button", { name: "Buy Veg Mix" }));
      await waitFor(() =>
        expect(openUrlSpy).toHaveBeenCalledWith("https://checkout.example.com/session")
      );

      expect(checkout).toHaveBeenCalledTimes(1);
      expect(checkout).toHaveBeenCalledWith(savedProductId, {
        returnPath: "/store/requested-store-alias"
      });
      expect(mockRecordCommercialAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "product_checkout_click",
          productId: savedProductId,
          storefrontSlug: "requested-store-alias",
          source: "public_storefront"
        })
      );
      expect(mockRouterPush).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Checkout started.")).toBeTruthy();
    });

    it.each(["purchaseIntentEnabled", "regulatedCannabis"])(
      "does not expose card Buy for %s products while signed out",
      async (flag: string) => {
        mockFetchPublicStorefront.mockResolvedValue({
          ...publicPayload,
          storefront: savedStorefront,
          products: [{ ...savedProduct, [flag]: true }]
        });
        const screen = render(<PublicStorefrontRoute />);
        await screen.findByText("Veg Mix");

        expect(screen.queryByRole("button", { name: "Buy Veg Mix" })).toBeNull();
        expect(mockRouterPush).not.toHaveBeenCalled();
        expectNoCheckout();
      }
    );
  });

  it("verifies a storefront Checkout return without starting another Checkout", async () => {
    mockGetProductPurchaseStatus.mockResolvedValue(paidProductPurchaseStatus);
    mockRouteParams = {
      slug: "living-soil-labs",
      productId: "product-1",
      courseId: "course-1",
      checkout: "success",
      product: "product-1"
    };

    const screen = render(<PublicProductRoute />);

    await waitFor(() =>
      expect(mockGetProductPurchaseStatus).toHaveBeenCalledWith("product-1")
    );
    expect(
      await screen.findByText(
        "Payment confirmed. The order is recorded and awaiting fulfillment."
      )
    ).toBeTruthy();
  });

  it("shows reusable purchase-interest answers on every enabled storefront product", async () => {
    mockFetchPublicStorefront.mockResolvedValue({
      ...publicPayload,
      products: [
        {
          ...publicPayload.products[1],
          purchaseIntentEnabled: true,
          purchaseIntentTarget: 25,
          purchaseIntentSummary: { yes: 4, maybe: 2, no: 1, total: 7 }
        }
      ]
    });
    const screen = render(<PublicStorefrontRoute />);

    await waitFor(() => expect(screen.getByText("Bloom Mix")).toBeTruthy());
    expect(screen.getByText("25-customer production goal")).toBeTruthy();
    expect(screen.getByText("4 yes · goal 25")).toBeTruthy();
    expect(screen.getByLabelText("yes — purchase interest for Bloom Mix")).toBeTruthy();
    expect(screen.getByLabelText("maybe — purchase interest for Bloom Mix")).toBeTruthy();
    expect(screen.getByLabelText("no — purchase interest for Bloom Mix")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("yes — purchase interest for Bloom Mix"));
    await waitFor(() =>
      expect(mockSubmitProductPurchaseIntent).toHaveBeenCalledWith("product-2", "yes")
    );
    expect(screen.getByText("5 yes · goal 25")).toBeTruthy();
  });

  describe.each([
    ["storefront card", PublicStorefrontRoute],
    ["product detail", PublicProductRoute]
  ] as const)("%s purchase-interest sign-in return", (_caller, Route) => {
    const savedProductId = "507f191e810c19729de86001";
    const savedStorefront = { ...publicPayload.storefront, slug: "living-soil-labs" };
    const savedProduct = {
      ...publicPayload.products[0],
      id: savedProductId,
      slug: "requested-product-alias",
      externalPurchaseUrl: undefined,
      purchaseIntentEnabled: true,
      purchaseIntentTarget: 25,
      purchaseIntentSummary: { yes: 4, maybe: 2, no: 1, total: 7 }
    };
    const loginPath = `/login?next=${encodeURIComponent(
      `/store/living-soil-labs/products/${savedProductId}`
    )}`;

    function expectNoCommerceOrClick() {
      expect(jest.requireMock("@/api/products").checkoutProduct).not.toHaveBeenCalled();
      expect(mockStartCourseCheckout).not.toHaveBeenCalled();
      expect(
        mockRecordCommercialAnalyticsEvent.mock.calls.filter(([event]) =>
          String(event?.eventType).includes("click")
        )
      ).toEqual([]);
    }

    function expectNoAction() {
      expect(mockSubmitProductPurchaseIntent).not.toHaveBeenCalled();
      expect(mockRouterPush).not.toHaveBeenCalled();
      expectNoCommerceOrClick();
    }

    function expectOnlyLoginLink(expected: string) {
      expect([
        ...new Set(mockLinkHrefs.filter((href) => href.startsWith("/login")))
      ]).toEqual([expected]);
    }

    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isAuthed: false, isHydrating: false, user: null });
      mockRouteParams = {
        slug: "requested-store-alias",
        productId: "requested-product-alias"
      };
      mockFetchPublicStorefront.mockResolvedValue({
        ...publicPayload,
        storefront: savedStorefront,
        products: [savedProduct]
      });
    });

    it.each(["id", "_id", "productId"])(
      "offers the canonical saved %s return instead of requested aliases without an action",
      async (field: string) => {
        mockFetchPublicStorefront.mockResolvedValue({
          ...publicPayload,
          storefront: savedStorefront,
          products: [
            {
              ...savedProduct,
              id: undefined,
              _id: undefined,
              productId: undefined,
              [field]: savedProductId
            }
          ]
        });
        const screen = render(<Route />);
        await screen.findByText("Sign in to opt in");

        expectOnlyLoginLink(loginPath);
        expect(screen.queryByRole("button", { name: "Buy Veg Mix" })).toBeNull();
        expect(screen.queryByLabelText("yes — purchase interest for Veg Mix")).toBeNull();
        expectNoAction();
      }
    );

    it.each([
      ["missing saved slug", undefined, savedProductId],
      ["array saved slug", ["living-soil-labs"], savedProductId],
      ["unsafe saved slug", "../admin", savedProductId],
      ["array saved id", "living-soil-labs", [savedProductId]],
      ["object saved id", "living-soil-labs", { value: savedProductId }],
      ["non-24hex saved id", "living-soil-labs", "product-1"],
      [
        "missing id despite a canonical-looking product slug",
        "living-soil-labs",
        undefined
      ]
    ])(
      "offers only plain sign-in for %s and does not invent an identity",
      async (_case: unknown, savedSlug: unknown, savedId: unknown) => {
        mockRouteParams = { slug: "requested-store-alias", productId: savedProductId };
        mockFetchPublicStorefront.mockResolvedValue({
          ...publicPayload,
          storefront: { ...savedStorefront, slug: savedSlug },
          products: [
            {
              ...savedProduct,
              id: savedId,
              _id: undefined,
              productId: undefined,
              slug: savedProductId
            }
          ]
        });
        const screen = render(<Route />);
        await screen.findByText("Sign in to opt in");

        expectOnlyLoginLink("/login");
        expect(screen.queryByRole("button", { name: "Buy Veg Mix" })).toBeNull();
        expectNoAction();
      }
    );

    it("does not replay interest after sign-in and keeps deliberate Yes on the existing API", async () => {
      const screen = render(<Route />);
      await screen.findByText("Sign in to opt in");
      expectOnlyLoginLink(loginPath);
      expect(screen.queryByRole("button", { name: "Buy Veg Mix" })).toBeNull();
      expectNoAction();

      mockUseAuth.mockReturnValue({
        isAuthed: true,
        isHydrating: false,
        user: { id: "viewer-1" }
      });
      screen.rerender(<Route />);
      const yes = await screen.findByLabelText("yes — purchase interest for Veg Mix");
      expect(screen.queryByText("Sign in to opt in")).toBeNull();
      expect(screen.queryByRole("button", { name: "Buy Veg Mix" })).toBeNull();
      expectNoAction();

      fireEvent.press(yes);
      await waitFor(() =>
        expect(mockSubmitProductPurchaseIntent).toHaveBeenCalledWith(
          savedProductId,
          "yes"
        )
      );
      expect(mockSubmitProductPurchaseIntent).toHaveBeenCalledTimes(1);
      expect(await screen.findByText("5 yes · goal 25")).toBeTruthy();
      expect(mockRouterPush).not.toHaveBeenCalled();
      expectNoCommerceOrClick();
    });
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

  it.each([
    ["productLineId", "line-1"],
    ["linkedProductLineId", "line-1"],
    ["productLineIds", ["line-other", "line-1"]],
    ["linkedProductLineIds", ["line-other", "line-1"]]
  ])("includes only matching public products linked by %s", async (field, value) => {
    mockRouteParams = { slug: "living-soil-labs", line: "line-1" };
    mockFetchPublicStorefront.mockResolvedValue({
      ...publicPayload,
      products: [
        {
          id: "family-product",
          name: "Linked family item",
          [field as string]: value
        },
        {
          id: "unrelated-product",
          name: "Unrelated family item",
          productLineIds: ["line-other"]
        }
      ]
    });
    const screen = render(<PublicStorefrontRoute />);
    await waitFor(() => expect(screen.getByText("Linked family item")).toBeTruthy());
    expect(screen.queryByText("Unrelated family item")).toBeNull();
    expect(screen.getByText("View All Products")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/store/living-soil-labs");
  });

  describe("ordinary product Buy sign-in return", () => {
    const savedProductId = "507f191e810c19729de86001";
    const savedStorefront = { ...publicPayload.storefront, slug: "living-soil-labs" };
    const savedProduct = {
      ...publicPayload.products[0],
      id: savedProductId,
      slug: "veg-mix"
    };
    const returnPath = `/store/living-soil-labs/products/${savedProductId}`;
    const loginPath = `/login?next=${encodeURIComponent(returnPath)}`;

    function expectNoCheckout() {
      expect(jest.requireMock("@/api/products").checkoutProduct).not.toHaveBeenCalled();
      expect(mockRecordCommercialAnalyticsEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ eventType: "product_checkout_click" })
      );
      expect(mockSubmitProductPurchaseIntent).not.toHaveBeenCalled();
    }

    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isAuthed: false, isHydrating: false, user: null });
      mockRouteParams = { slug: "living-soil-labs", productId: savedProductId };
      mockFetchPublicStorefront.mockResolvedValue({
        ...publicPayload,
        storefront: savedStorefront,
        products: [savedProduct]
      });
    });

    it("sends signed-out Buy to login with only the canonical product detail return", async () => {
      const screen = render(<PublicProductRoute />);
      const buy = await screen.findByRole("button", { name: "Buy Veg Mix" });

      expect(mockRouterPush).not.toHaveBeenCalled();
      expectNoCheckout();
      fireEvent.press(buy);

      expect(mockRouterPush).toHaveBeenCalledTimes(1);
      expect(mockRouterPush).toHaveBeenCalledWith(loginPath);
      expectNoCheckout();
    });

    it.each(["id", "_id", "productId"])(
      "uses the resolved %s and storefront slug instead of requested aliases",
      async (field: string) => {
        mockRouteParams = { slug: "requested-store-alias", productId: "veg-mix" };
        mockFetchPublicStorefront.mockResolvedValue({
          ...publicPayload,
          storefront: savedStorefront,
          products: [{ ...savedProduct, id: undefined, [field]: savedProductId }]
        });
        const screen = render(<PublicProductRoute />);
        fireEvent.press(await screen.findByRole("button", { name: "Buy Veg Mix" }));

        expect(mockRouterPush).toHaveBeenCalledWith(loginPath);
        expectNoCheckout();
      }
    );

    it.each([
      ["missing stored slug", undefined, savedProductId],
      ["unsafe stored slug", "../admin", savedProductId],
      ["noncanonical product id", "living-soil-labs", "product-1"],
      ["array product id", "living-soil-labs", [savedProductId]],
      ["product slug without record id", "living-soil-labs", undefined]
    ])(
      "falls back to plain login for %s without inventing a return identity",
      async (_case: unknown, savedSlug: unknown, savedId: unknown) => {
        mockRouteParams = { slug: "living-soil-labs", productId: savedProductId };
        mockFetchPublicStorefront.mockResolvedValue({
          ...publicPayload,
          storefront: { ...savedStorefront, slug: savedSlug },
          products: [{ ...savedProduct, id: savedId, slug: savedProductId }]
        });
        const screen = render(<PublicProductRoute />);
        fireEvent.press(await screen.findByRole("button", { name: "Buy Veg Mix" }));

        expect(mockRouterPush).toHaveBeenCalledWith("/login");
        expectNoCheckout();
      }
    );

    it.each([false, true])(
      "blocks the Buy handler during auth hydration even when isAuthed is %s",
      async (isAuthed: boolean) => {
        mockUseAuth.mockReturnValue({ isAuthed, isHydrating: true, user: null });
        const screen = render(<PublicProductRoute />);
        const buy = await screen.findByRole("button", { name: "Buy Veg Mix" });

        expect(buy).toBeDisabled();
        expect(buy).toHaveProp("accessibilityState", { disabled: true, busy: false });
        fireEvent.press(buy);
        const handler = screen.UNSAFE_root.findAll(
          (node: { props: { accessibilityLabel?: string; onPress?: unknown } }) =>
            node.props.accessibilityLabel === "Buy Veg Mix" &&
            typeof node.props.onPress === "function"
        )[0].props.onPress;
        await act(async () => handler());

        expect(mockRouterPush).not.toHaveBeenCalled();
        expectNoCheckout();
      }
    );

    it("requires a fresh Buy after login and preserves the signed-in checkout flow", async () => {
      const checkout = jest.requireMock("@/api/products").checkoutProduct;
      checkout.mockResolvedValue({ url: "https://checkout.example.com/session" });
      const openUrlSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
      const screen = render(<PublicProductRoute />);
      fireEvent.press(await screen.findByRole("button", { name: "Buy Veg Mix" }));
      expect(mockRouterPush).toHaveBeenCalledWith(loginPath);

      mockUseAuth.mockReturnValue({
        isAuthed: true,
        isHydrating: false,
        user: { id: "viewer-1" }
      });
      screen.rerender(<PublicProductRoute />);
      expectNoCheckout();
      expect(mockRouterPush).toHaveBeenCalledTimes(1);

      fireEvent.press(screen.getByRole("button", { name: "Buy Veg Mix" }));
      await waitFor(() =>
        expect(openUrlSpy).toHaveBeenCalledWith("https://checkout.example.com/session")
      );

      expect(checkout).toHaveBeenCalledTimes(1);
      expect(checkout).toHaveBeenCalledWith(savedProductId, { returnPath });
      expect(mockRecordCommercialAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "product_checkout_click",
          objectId: savedProductId,
          productId: savedProductId,
          storefrontSlug: "living-soil-labs",
          source: "public_product"
        })
      );
      expect(mockRouterPush).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Checkout started.")).toBeTruthy();
    });
  });

  describe("public product description display", () => {
    const description = "Product copy: Soft cotton with an adjustable fit.";
    const distinctShort = "Product copy: Hand-finished details.";

    it.each([
      ["identical descriptions once", description, description, [description]],
      [
        "distinct descriptions in their existing order",
        description,
        distinctShort,
        [description, distinctShort]
      ],
      ["description only", description, undefined, [description]],
      ["short description only", undefined, distinctShort, [distinctShort]],
      ["neither description", undefined, undefined, []],
      [
        "whitespace-different descriptions",
        description,
        `${description} `,
        [description, `${description} `]
      ],
      [
        "case-different descriptions",
        description,
        description.toUpperCase(),
        [description, description.toUpperCase()]
      ]
    ] as const)("renders %s", async (_case, full, short, expected) => {
      mockFetchPublicStorefront.mockResolvedValue({
        ...publicPayload,
        products: [
          { ...publicPayload.products[0], description: full, shortDescription: short }
        ]
      });
      const screen = render(<PublicProductRoute />);
      await screen.findByRole("header", { name: "Veg Mix" });

      // Inspect the real rendered text in order without normalizing whitespace or case.
      // Share-post payloads are deliberately outside this display-only assertion.
      const visibleCopy = screen
        .queryAllByText(/product copy:/i, {
          normalizer: (value) => value
        })
        .map((node) => node.props.children);
      expect(visibleCopy).toEqual(expected);
      expect(screen.getByText("Share this product")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Buy Veg Mix" })).toBeTruthy();
      expect(jest.requireMock("@/api/products").checkoutProduct).not.toHaveBeenCalled();
      expect(mockSubmitProductPurchaseIntent).not.toHaveBeenCalled();
    });
  });

  it("loads a public product detail page with storefront navigation", async () => {
    const openUrlSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
    const screen = render(<PublicProductRoute />);

    await waitFor(() =>
      expect(mockFetchPublicStorefront).toHaveBeenCalledWith("living-soil-labs")
    );
    expect(screen.getByRole("header", { name: "Veg Mix" })).toHaveProp("aria-level", 1);
    expect(screen.getAllByText("Shared Back /store/living-soil-labs")).toHaveLength(1);
    expect(screen.getByText("All products from this store")).toBeTruthy();
    expect(mockLinkHrefs).toContain("/store/living-soil-labs");
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
    expect(screen.getAllByText("Open Course").length).toBeGreaterThan(0);
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
    expect(screen.getByText("Share this product")).toBeTruthy();
    expect(screen.getByText("Copy Link")).toBeTruthy();
    expect(screen.getByText("Copy Post")).toBeTruthy();
    expect(screen.getByText("Facebook")).toBeTruthy();
    fireEvent.press(screen.getByRole("link", { name: "Share Veg Mix to Facebook" }));
    expect(decodeURIComponent(String(openUrlSpy.mock.calls[0]?.[0] || ""))).toContain(
      "https://api.growpathai.com/api/commercial/storefront/public/living-soil-labs/products/product-1/share?v=abc123"
    );
    expect(screen.getByRole("button", { name: "Share Veg Mix" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy link for Veg Mix" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy post for Veg Mix" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "View full image for Veg Mix" })
    ).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "View full image for Veg Mix" }));
    expect(screen.getByLabelText("Full image for Veg Mix")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Close full product image" }));
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
    openUrlSpy.mockRestore();
  });

  it("binds product refund support to the exact recorded Storefront order", async () => {
    mockGetProductPurchaseStatus.mockResolvedValue(paidProductPurchaseStatus);
    const screen = render(<PublicProductRoute />);

    await waitFor(() =>
      expect(mockGetProductPurchaseStatus).toHaveBeenCalledWith("product-1")
    );
    fireEvent.press(screen.getByLabelText("Open payment support"));
    fireEvent.changeText(
      screen.getByLabelText("Refund request reason"),
      "The delivered product did not match the listing."
    );
    fireEvent.press(screen.getByText("Request refund review"));

    await waitFor(() =>
      expect(mockRequestProductRefund).toHaveBeenCalledWith("product-1", {
        recordId: "507f191e810c19729de86001",
        expectedRefundedAmountCents: 0,
        reason: "The delivered product did not match the listing."
      })
    );
  });

  it("retains the buyer's fully refunded order history on a plain product link", async () => {
    mockGetProductPurchaseStatus.mockResolvedValue({
      ...paidProductPurchaseStatus,
      paymentStatus: "refunded",
      refundedAmountCents: 2500,
      refundStatus: "full",
      refundLifecycleStatus: "full"
    });
    const screen = render(<PublicProductRoute />);

    fireEvent.press(await screen.findByLabelText("Open payment support"));
    expect(screen.getByText(/provider refund: full/)).toBeTruthy();
    expect(screen.getByText(/This payment is fully refunded/)).toBeTruthy();
    expect(screen.getByLabelText("Submit refund review request")).toBeDisabled();
    expect(screen.getByLabelText("Submit payment issue report")).toBeDisabled();
    expect(mockGetProductPurchaseStatus).toHaveBeenCalledWith("product-1");
    expect(mockRequestProductRefund).not.toHaveBeenCalled();
    expect(mockReportProductPaymentIssue).not.toHaveBeenCalled();
    expect(jest.requireMock("@/api/products").checkoutProduct).not.toHaveBeenCalled();
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

  describe("storefront course Buy sign-in return", () => {
    const savedCourseId = "507f191e810c19729de86002";
    const savedStorefront = { ...publicPayload.storefront, slug: "living-soil-labs" };
    const savedCourse = {
      ...publicPayload.courses[0],
      id: savedCourseId,
      slug: "using-veg-mix"
    };
    const loginPath = `/login?next=${encodeURIComponent(
      `/store/living-soil-labs/courses/${savedCourseId}`
    )}`;

    function expectNoCheckout() {
      expect(mockStartCourseCheckout).not.toHaveBeenCalled();
      expect(mockRecordCommercialAnalyticsEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ eventType: "course_checkout_click" })
      );
    }

    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isAuthed: false, isHydrating: false, user: null });
      mockRouteParams = { slug: "requested-store-alias", courseId: "using-veg-mix" };
      mockFetchPublicStorefront.mockResolvedValue({
        ...publicPayload,
        storefront: savedStorefront,
        courses: [savedCourse]
      });
    });

    it.each(["id", "_id", "courseId"])(
      "returns signed-out Buy to the stored %s detail instead of requested aliases",
      async (field: string) => {
        mockFetchPublicStorefront.mockResolvedValue({
          ...publicPayload,
          storefront: savedStorefront,
          courses: [{ ...savedCourse, id: undefined, [field]: savedCourseId }]
        });
        const screen = render(<PublicStorefrontCourseAliasRoute />);
        const buy = await screen.findByRole("button", { name: "Buy storefront course" });
        expect(mockRouterPush).not.toHaveBeenCalled();
        fireEvent.press(buy);

        expect(mockRouterPush).toHaveBeenCalledTimes(1);
        expect(mockRouterPush).toHaveBeenCalledWith(loginPath);
        expectNoCheckout();
        expect(mockPollCourseAccessStatus).not.toHaveBeenCalled();
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      }
    );

    it.each([
      ["missing stored slug", undefined, savedCourseId],
      ["unsafe stored slug", "../admin", savedCourseId],
      ["noncanonical course id", "living-soil-labs", "course-1"],
      ["array course id", "living-soil-labs", [savedCourseId]],
      ["course slug without record id", "living-soil-labs", undefined]
    ])(
      "falls back to plain sign-in for %s without creating checkout",
      async (_case: unknown, savedSlug: unknown, savedId: unknown) => {
        mockFetchPublicStorefront.mockResolvedValue({
          ...publicPayload,
          storefront: { ...savedStorefront, slug: savedSlug },
          courses: [{ ...savedCourse, id: savedId }]
        });
        const screen = render(<PublicStorefrontCourseRoute />);
        fireEvent.press(
          await screen.findByRole("button", { name: "Buy storefront course" })
        );

        expect(mockRouterPush).toHaveBeenCalledWith("/login");
        expectNoCheckout();
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      }
    );

    it.each([false, true])(
      "blocks new paid Buy during auth hydration when isAuthed is %s",
      async (isAuthed: boolean) => {
        mockUseAuth.mockReturnValue({ isAuthed, isHydrating: true, user: null });
        const screen = render(<PublicStorefrontCourseRoute />);
        const buy = await screen.findByRole("button", { name: "Buy storefront course" });
        expect(buy).toBeDisabled();
        expect(buy).toHaveProp("accessibilityState", { disabled: true, busy: false });
        fireEvent.press(buy);
        const handler = screen.UNSAFE_root.findAll(
          (node: { props: { accessibilityLabel?: string; onPress?: unknown } }) =>
            node.props.accessibilityLabel === "Buy storefront course" &&
            typeof node.props.onPress === "function"
        )[0].props.onPress;
        await act(async () => handler());

        expect(mockRouterPush).not.toHaveBeenCalled();
        expectNoCheckout();
        expect(mockPollCourseAccessStatus).not.toHaveBeenCalled();
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      }
    );

    it("does not auto-buy after login and retains signed-in checkout and recovery arguments", async () => {
      mockStartCourseCheckout.mockResolvedValue({
        url: "https://checkout.example.com/course"
      });
      const openUrlSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
      const screen = render(<PublicStorefrontCourseRoute />);
      fireEvent.press(
        await screen.findByRole("button", { name: "Buy storefront course" })
      );
      expect(mockRouterPush).toHaveBeenCalledWith(loginPath);

      mockUseAuth.mockReturnValue({
        isAuthed: true,
        isHydrating: false,
        user: { id: "viewer-1" }
      });
      screen.rerender(<PublicStorefrontCourseRoute />);
      expectNoCheckout();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      fireEvent.press(screen.getByRole("button", { name: "Buy storefront course" }));

      await waitFor(() =>
        expect(openUrlSpy).toHaveBeenCalledWith("https://checkout.example.com/course")
      );
      expect(mockStartCourseCheckout).toHaveBeenCalledTimes(1);
      expect(mockStartCourseCheckout).toHaveBeenCalledWith(savedCourseId, {
        returnPath: "/store/requested-store-alias/courses/using-veg-mix"
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@growpath/buyer-checkout-recovery/v1/course",
        expect.any(String)
      );
      const stored = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(stored).toEqual(
        expect.objectContaining({
          kind: "course",
          itemId: savedCourseId,
          returnPath: "/store/requested-store-alias/courses/using-veg-mix"
        })
      );
      expect(mockRecordCommercialAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "course_checkout_click",
          courseId: savedCourseId,
          storefrontSlug: "requested-store-alias",
          source: "public_storefront_course"
        })
      );
      expect(mockRouterPush).toHaveBeenCalledTimes(1);
    });

    it("keeps signed-out free Open as an explicit course-detail handoff", async () => {
      mockFetchPublicStorefront.mockResolvedValue({
        ...publicPayload,
        storefront: savedStorefront,
        courses: [{ ...savedCourse, access: "free", price: 0, stripePriceId: undefined }]
      });
      const openUrlSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
      const screen = render(<PublicStorefrontCourseRoute />);
      fireEvent.press(
        await screen.findByRole("button", { name: "Open storefront course" })
      );

      await waitFor(() =>
        expect(openUrlSpy).toHaveBeenCalledWith(`/courses?courseId=${savedCourseId}`)
      );
      expect(mockRouterPush).not.toHaveBeenCalled();
      expectNoCheckout();
    });

    it.each(["confirmed", "pending"])(
      "preserves signed-out %s recovery before the new-Buy sign-in guard",
      async (state: string) => {
        mockRouteParams = { ...mockRouteParams, checkout: "success" };
        mockPollCourseAccessStatus.mockResolvedValue({
          attempts: 1,
          snapshot: { enrolled: state === "confirmed", paymentStatus: "paid" },
          state
        });
        const openUrlSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
        const screen = render(<PublicStorefrontCourseRoute />);
        const label =
          state === "confirmed"
            ? "Open enrolled storefront course"
            : "Check storefront course payment status";
        await waitFor(() =>
          expect(screen.getByRole("button", { name: label })).not.toBeDisabled()
        );
        fireEvent.press(screen.getByRole("button", { name: label }));

        await waitFor(() => {
          if (state === "confirmed") {
            expect(openUrlSpy).toHaveBeenCalledWith(`/courses?courseId=${savedCourseId}`);
          } else {
            expect(mockPollCourseAccessStatus).toHaveBeenCalledTimes(2);
          }
        });
        expect(mockRouterPush).not.toHaveBeenCalled();
        expectNoCheckout();
      }
    );

    it("preserves canceled recovery and requires sign-in only for a new paid Buy", async () => {
      mockRouteParams = { ...mockRouteParams, checkout: "canceled" };
      const screen = render(<PublicStorefrontCourseRoute />);
      await screen.findByText("Checkout was canceled. Course access was not changed.");
      expect(mockRouterPush).not.toHaveBeenCalled();
      expectNoCheckout();
      fireEvent.press(screen.getByRole("button", { name: "Buy storefront course" }));

      expect(mockRouterPush).toHaveBeenCalledWith(loginPath);
      expectNoCheckout();
    });
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

    await waitFor(() =>
      expect(mockPollCourseAccessStatus).toHaveBeenCalledWith(
        "course-1",
        expect.objectContaining({ shouldContinue: expect.any(Function) })
      )
    );
    expect(await screen.findByText("Enrollment confirmed")).toBeTruthy();
    expect(screen.getByLabelText("Open course enrollment status")).toBeTruthy();
    expect(screen.getAllByText("Open Course").length).toBeGreaterThan(0);
    expect(mockLinkHrefs).toContain(
      "/home/personal/courses?courseId=course-1&checkout=success"
    );
  });

  it("keeps a pending course return on status recovery instead of starting another Checkout", async () => {
    mockPollCourseAccessStatus.mockResolvedValue({
      attempts: 5,
      snapshot: { enrolled: false, paymentStatus: "paid" },
      state: "pending"
    });
    mockRouteParams = {
      slug: "living-soil-labs",
      courseId: "course-1",
      checkout: "success",
      course: "course-1"
    };
    const screen = render(<PublicStorefrontCourseRoute />);

    await waitFor(() => expect(mockPollCourseAccessStatus).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Confirming enrollment")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Check storefront course payment status"));

    await waitFor(() => expect(mockPollCourseAccessStatus).toHaveBeenCalledTimes(2));
    expect(mockStartCourseCheckout).not.toHaveBeenCalled();
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
