import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockSearchVideos = jest.fn();
const mockListPublicFieldObservations = jest.fn();
const mockDiscoverPublicProductsAndTrials = jest.fn();
const mockSubmitProductPurchaseIntent = jest.fn();
const mockCheckoutProduct = jest.fn();
const mockRecordCommercialAnalyticsEvent = jest.fn();
const mockLinkHrefs: string[] = [];
let mockUser: { id: string } | null = null;
let mockThemeMode: "day" | "night" = "night";
let mockWorkspaceMode: "personal" | "commercial" | "facility" = "personal";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({ children, href }: any) => {
    mockLinkHrefs.push(href);
    return require("react").cloneElement(children, {
      href,
      onPress: () => mockPush(href)
    });
  }
}));

jest.mock("@/auth/AuthContext", () => ({
  useOptionalAuth: () => ({
    user: mockUser,
    isAuthed: Boolean(mockUser),
    isHydrating: false
  })
}));
jest.mock("@/api/products", () => ({
  submitProductPurchaseIntent: (...args: unknown[]) =>
    mockSubmitProductPurchaseIntent(...args),
  checkoutProduct: (...args: unknown[]) => mockCheckoutProduct(...args)
}));
jest.mock("@/api/commercialAnalytics", () => ({
  recordCommercialAnalyticsEvent: (...args: unknown[]) =>
    mockRecordCommercialAnalyticsEvent(...args)
}));

jest.mock("@/components/layout/AppPage", () => ({
  __esModule: true,
  default: function MockAppPage({ header, children }: any) {
    const MockView = require("react-native").View;
    return (
      <MockView>
        {header}
        {children}
      </MockView>
    );
  }
}));

jest.mock("@/components/layout/AppCard", () => ({
  __esModule: true,
  default: function MockAppCard({ children }: any) {
    const MockView = require("react-native").View;
    return <MockView>{children}</MockView>;
  }
}));

jest.mock("@/api/commercialFeed", () => ({
  listCommercialFeedCampaigns: jest.fn(async () => ({ items: [] }))
}));
jest.mock("@/api/marketplace", () => ({
  searchContent: jest.fn(async () => [])
}));
jest.mock("@/api/storefront", () => ({
  searchPublicStorefronts: jest.fn(async () => []),
  discoverPublicProductsAndTrials: (...args: any[]) =>
    mockDiscoverPublicProductsAndTrials(...args)
}));
jest.mock("@/api/fieldStudies", () => ({
  listPublicFieldObservations: (...args: any[]) =>
    mockListPublicFieldObservations(...args)
}));
jest.mock("@/components/fieldStudies/FieldObservationGlobe", () => ({
  __esModule: true,
  default: function MockFieldObservationGlobe({ observations }: any) {
    const MockText = require("react-native").Text;
    return <MockText>{`${observations.length} globe observations`}</MockText>;
  }
}));
jest.mock("@/api/courses", () => ({
  listCourses: jest.fn(async () => []),
  searchCourses: jest.fn(async () => [])
}));
jest.mock("@/api/videos", () => ({
  searchVideos: (...args: any[]) => mockSearchVideos(...args)
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ mode: mockWorkspaceMode })
}));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({
      palette: actual.getThemePalette(
        mockThemeMode,
        mockThemeMode === "night" ? "dark" : "light"
      )
    })
  };
});

import DiscoverDirectory, {
  createDiscoverVideoFilterStyles,
  discoverCatalogImageSourceOf,
  discoverCourseHref,
  discoverImageOf,
  discoverLiveHref,
  isDiscoverableCourse
} from "@/app/discover";
import { getThemePalette } from "@/theme/appTheme";

describe("Discover video search", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSearchVideos.mockReset();
    mockListPublicFieldObservations.mockReset();
    mockDiscoverPublicProductsAndTrials.mockReset();
    mockSubmitProductPurchaseIntent.mockReset();
    mockCheckoutProduct.mockReset();
    mockRecordCommercialAnalyticsEvent.mockReset();
    mockLinkHrefs.length = 0;
    mockUser = null;
    mockSubmitProductPurchaseIntent.mockResolvedValue({
      response: "yes",
      summary: { yes: 5, maybe: 2, no: 1, total: 8 }
    });
    jest
      .requireMock("@/api/commercialFeed")
      .listCommercialFeedCampaigns.mockResolvedValue({ items: [] });
    jest.requireMock("@/api/storefront").searchPublicStorefronts.mockResolvedValue([]);
    jest.requireMock("@/api/marketplace").searchContent.mockResolvedValue([]);
    mockThemeMode = "night";
    mockWorkspaceMode = "personal";
    mockSearchVideos.mockResolvedValue([
      {
        id: "video-1",
        title: "Tomato training",
        description: "Pruning and trellising",
        visibility: "public",
        owner: { displayName: "Garden Member" },
        mediaSource: {}
      }
    ]);
    mockListPublicFieldObservations.mockResolvedValue([]);
    mockDiscoverPublicProductsAndTrials.mockResolvedValue({ items: [] });
  });

  it("resolves available discovery art and exact course/live destinations", () => {
    expect(discoverImageOf({ bannerImageUrl: "https://cdn.example.com/store.jpg" })).toBe(
      "https://cdn.example.com/store.jpg"
    );
    expect(discoverCourseHref({ id: "course / 1" })).toBe(
      "/courses?courseId=course%20%2F%201"
    );
    expect(discoverLiveHref({ linkedLiveId: "live / 1" })).toBe(
      "/live-session?sessionId=live%20%2F%201"
    );
  });

  it("uses the bundled approved concept image without web-only Image APIs", () => {
    expect(
      discoverCatalogImageSourceOf({
        discoveryType: "trial",
        conceptAssetId: "growpathai-hat-circuit-leaf-midnight-purchase-intent-trial"
      })
    ).toBeTruthy();
  });

  it("keeps explicit QA-only and test-only courses out of customer discovery", () => {
    expect(isDiscoverableCourse({ title: "QA ONLY — paid lifecycle" })).toBe(false);
    expect(isDiscoverableCourse({ title: "Test-only course" })).toBe(false);
    expect(isDiscoverableCourse({ title: "Living Soil Basics" })).toBe(true);
  });

  it.each([
    ["commercial", "/home/commercial/tools/species-crop-id?workspace=commercial"],
    ["facility", "/home/facility/tools/species-crop-id?workspace=facility"]
  ] as const)(
    "keeps Plant ID inside the active %s workspace",
    async (mode, expectedHref) => {
      mockWorkspaceMode = mode;
      render(<DiscoverDirectory />);

      await waitFor(() => expect(screen.getByText("Identify a Plant")).toBeTruthy());
      fireEvent.press(screen.getByLabelText("Open Identify a Plant"));
      expect(mockPush).toHaveBeenCalledWith(expectedHref);
    }
  );

  it("shows accessible videos as a first-class Discover section", async () => {
    render(<DiscoverDirectory />);

    await waitFor(() => {
      expect(screen.getByText("Tomato training")).toBeTruthy();
    });
    expect(screen.getByText("Videos")).toBeTruthy();
    expect(screen.getAllByText("Discovery Nature")).toHaveLength(1);
    expect(screen.getByText("Identify a Plant")).toBeTruthy();
    expect(screen.getByText("Explore Mapped Plant Findings")).toBeTruthy();
    expect(screen.getByText("0 globe observations")).toBeTruthy();
    expect(screen.getByLabelText("Open Discovery Nature globe")).toBeTruthy();
    expect(
      screen.getByText(
        "No public pins yet. Tap to open the globe or identify and deliberately share a plant finding."
      )
    ).toBeTruthy();
    expect(mockListPublicFieldObservations).toHaveBeenCalledWith({ limit: 100 });
    expect(mockSearchVideos).toHaveBeenCalledWith({
      q: undefined,
      sort: "new",
      limit: 18,
      followingOnly: undefined
    });

    fireEvent.press(screen.getByLabelText("Show videos from people you follow"));
    await waitFor(() => {
      expect(mockSearchVideos).toHaveBeenCalledWith({
        q: undefined,
        sort: "new",
        limit: 18,
        followingOnly: true
      });
    });

    fireEvent.press(screen.getByLabelText("Open Tomato training"));
    expect(mockPush).toHaveBeenCalledWith("/videos/video-1");

    fireEvent.press(screen.getByLabelText("Open Identify a Plant"));
    expect(mockPush).toHaveBeenCalledWith("/home/personal/tools/species-crop-id");
    fireEvent.press(screen.getByLabelText("Open Explore Mapped Plant Findings"));
    expect(mockPush).toHaveBeenCalledWith("/field-observations");
    fireEvent.press(screen.getByLabelText("Open Discovery Nature globe"));
    expect(mockPush).toHaveBeenCalledWith("/field-observations");
  });

  it("shows published products and public trials without requiring feed campaigns", async () => {
    mockDiscoverPublicProductsAndTrials.mockResolvedValue({
      items: [
        {
          id: "507f191e810c19729de86001",
          discoveryType: "product",
          name: "Night Script Cord",
          shortDescription: "Navy corduroy hat",
          imageUrl: "https://cdn.example.com/night-script.png",
          storefrontName: "GrowPathAI",
          storefrontSlug: "growpathai",
          publicHref: "/store/growpathai/products/507f191e810c19729de86001"
        },
        {
          id: "trial-1",
          discoveryType: "trial",
          conceptTitle: "GrowPathAI Circuit Leaf — Midnight",
          conceptAssetId: "growpathai-hat-circuit-leaf-midnight-purchase-intent-trial",
          question: "Would you buy this hat for $49?",
          storefrontSlug: "growpathai",
          publicHref: "/store/growpathai#product-trials"
        }
      ]
    });

    render(<DiscoverDirectory />);

    await waitFor(() => expect(screen.getByText("Night Script Cord")).toBeTruthy());
    expect(screen.getByText("GrowPathAI Circuit Leaf — Midnight")).toBeTruthy();
    expect(mockDiscoverPublicProductsAndTrials).toHaveBeenCalledWith({
      q: undefined,
      limit: 24
    });

    fireEvent.press(screen.getByLabelText("Open Night Script Cord"));
    expect(mockPush).toHaveBeenCalledWith(
      "/store/growpathai/products/507f191e810c19729de86001"
    );
    fireEvent.press(screen.getByLabelText("Open GrowPathAI Circuit Leaf — Midnight"));
    expect(mockPush).toHaveBeenCalledWith("/store/growpathai#product-trials");
    fireEvent.press(screen.getByLabelText("View all Products, Offers & Trials"));
    expect(mockPush).toHaveBeenCalledWith("/products");
  });

  it("keeps public trials inside the visible product rail when many products exist", async () => {
    mockDiscoverPublicProductsAndTrials.mockResolvedValue({
      items: [
        ...Array.from({ length: 14 }, (_, index) => ({
          id: `hat-${index + 1}`,
          discoveryType: "product",
          name: `Published hat ${index + 1}`,
          imageUrl: `https://cdn.example.com/hat-${index + 1}.png`,
          storefrontSlug: "growpathai"
        })),
        {
          id: "trial-visible",
          discoveryType: "trial",
          conceptTitle: "GrowPathAI Circuit Leaf — Midnight",
          conceptAssetId: "growpathai-hat-circuit-leaf-midnight-purchase-intent-trial",
          storefrontSlug: "growpathai"
        }
      ]
    });

    render(<DiscoverDirectory />);

    await waitFor(() =>
      expect(screen.getByText("GrowPathAI Circuit Leaf — Midnight")).toBeTruthy()
    );
    expect(screen.queryByText("Published hat 12")).toBeNull();
  });

  describe("saved Discover product destinations", () => {
    const savedId = "507f191e810c19729de86001";
    const otherId = "507f191e810c19729de86002";
    const productPath = `/store/growpathai/products/${savedId}`;
    const loginPath = `/login?next=${encodeURIComponent(productPath)}`;
    const product = {
      id: savedId,
      discoveryType: "product",
      name: "Canonical Interest Hat",
      shortDescription: "Navy corduroy hat",
      imageUrl: "https://cdn.example.com/night-script.png",
      storefrontName: "GrowPathAI",
      storefrontSlug: "growpathai",
      publicHref: productPath,
      purchaseIntentEnabled: true,
      purchaseIntentTarget: 25,
      purchaseIntentSummary: { yes: 4, maybe: 2, no: 1, total: 7 }
    };

    function expectNoCheckoutOrClick() {
      expect(mockCheckoutProduct).not.toHaveBeenCalled();
      expect(
        mockRecordCommercialAnalyticsEvent.mock.calls.filter(([event]) =>
          String(event?.eventType).includes("click")
        )
      ).toEqual([]);
    }

    function expectNoAction() {
      expect(mockSubmitProductPurchaseIntent).not.toHaveBeenCalled();
      expectNoCheckoutOrClick();
    }

    async function expectProductDestinations(
      overrides: Record<string, unknown> = {},
      expectedProductPath = productPath,
      expectedLoginPath = loginPath
    ) {
      mockDiscoverPublicProductsAndTrials.mockResolvedValue({
        items: [{ ...product, ...overrides }]
      });
      render(<DiscoverDirectory />);
      await screen.findByLabelText("Open Canonical Interest Hat");
      const signIn = screen.getByRole("link");
      expect(signIn.props.href).toBe(expectedLoginPath);
      expect([...new Set(mockLinkHrefs)]).toEqual([expectedLoginPath]);
      expect(
        screen.queryByLabelText("yes — purchase interest for Canonical Interest Hat")
      ).toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
      expectNoAction();

      fireEvent.press(screen.getByLabelText("Open Canonical Interest Hat"));
      expect(mockPush).toHaveBeenLastCalledWith(expectedProductPath);
      expectNoAction();
      fireEvent.press(signIn);
      expect(mockPush).toHaveBeenLastCalledWith(expectedLoginPath);
      expect(mockPush).toHaveBeenCalledTimes(2);
      expectNoAction();
    }

    it.each([false, true])(
      "keeps the backend canonical product destination with purchase interest %s",
      async (purchaseIntentEnabled) => {
        mockDiscoverPublicProductsAndTrials.mockResolvedValue({
          items: [{ ...product, purchaseIntentEnabled }]
        });
        render(<DiscoverDirectory />);
        await screen.findByLabelText("Open Canonical Interest Hat");
        expectNoAction();
        fireEvent.press(screen.getByLabelText("Open Canonical Interest Hat"));
        expect(mockPush).toHaveBeenCalledWith(productPath);
        if (purchaseIntentEnabled) {
          expect(screen.getByRole("link").props.href).toBe(loginPath);
          fireEvent.press(screen.getByText("Sign in to opt in"));
          expect(mockPush).toHaveBeenLastCalledWith(loginPath);
        } else {
          expect(screen.queryByText("Sign in to opt in")).toBeNull();
          expect(screen.queryByText("25-customer production goal")).toBeNull();
          expect(mockLinkHrefs).toEqual([]);
        }
        expectNoAction();
      }
    );

    it("uses saved identity instead of product slug, SKU, contentId, and display title", async () => {
      await expectProductDestinations({
        slug: "other-product-slug",
        sku: otherId,
        contentId: otherId,
        title: "Canonical Interest Hat",
        publicHref: undefined
      });
    });

    it.each([
      ["missing", undefined],
      ["external", "https://other.example.com/pay"],
      ["course", `/courses?courseId=${otherId}`],
      ["claim", "/claim-complimentary-access"],
      ["query", `${productPath}?buy=1`],
      ["fragment", `${productPath}#checkout`],
      ["array", [productPath]],
      ["object", { path: productPath }],
      ["another product", `/store/other-store/products/${otherId}`]
    ])("ignores %s publicHref for both product consumers", async (_case, publicHref) => {
      await expectProductDestinations({ publicHref });
    });

    it.each([
      ["_id only", { id: undefined, _id: savedId }],
      ["productId only", { id: undefined, productId: savedId }],
      ["matching aliases", { id: savedId, _id: savedId, productId: savedId }],
      ["absent empty aliases", { id: "", _id: null, productId: savedId }],
      ["missing first alias", { id: null, _id: savedId, productId: "" }]
    ] as const)(
      "supports scalar nonconflicting %s as defensive links only",
      async (_case, overrides) => {
        await expectProductDestinations(overrides);
      }
    );

    it.each([
      ["missing ID", { id: undefined }],
      ["missing storefront slug", { storefrontSlug: undefined, slug: "growpathai" }],
      ["array storefront slug", { storefrontSlug: ["growpathai"] }],
      ["object storefront slug", { storefrontSlug: { slug: "growpathai" } }],
      ["whitespace storefront slug", { storefrontSlug: " growpathai" }],
      ["unsafe storefront slug", { storefrontSlug: "../admin" }],
      ["uppercase storefront slug", { storefrontSlug: "GrowPathAI" }],
      ["empty storefront slug", { storefrontSlug: "", brandSlug: "growpathai" }],
      ["non-24hex ID", { id: "hat-1" }],
      ["array ID", { id: [savedId] }],
      ["object ID", { id: { id: savedId } }],
      ["whitespace ID", { id: ` ${savedId}` }],
      ["uppercase ID", { id: savedId.toUpperCase() }],
      ["malformed id despite valid alias", { id: [savedId], _id: savedId }],
      ["malformed _id despite valid id", { _id: [savedId] }],
      ["malformed productId despite valid id", { productId: { id: savedId } }],
      ["conflicting _id", { _id: otherId }],
      ["conflicting productId", { productId: otherId }],
      [
        "conflicting aliases without id",
        { id: undefined, _id: savedId, productId: otherId }
      ],
      [
        "canonical-looking product slug without saved ID",
        { id: undefined, slug: savedId }
      ],
      [
        "contentId and SKU without saved ID",
        { id: undefined, contentId: savedId, sku: savedId }
      ],
      [
        "publicSlug without saved storefront slug",
        { storefrontSlug: undefined, publicSlug: "growpathai" }
      ]
    ] as const)(
      "fails closed for %s despite a valid-looking publicHref",
      async (_case, overrides) => {
        await expectProductDestinations(overrides, "/products", "/login");
      }
    );

    it("does not infer a missing record ID from a canonical-looking title", async () => {
      mockDiscoverPublicProductsAndTrials.mockResolvedValue({
        items: [{ ...product, id: undefined, title: savedId }]
      });
      render(<DiscoverDirectory />);
      await screen.findByLabelText(`Open ${savedId}`);
      expect(screen.getByRole("link").props.href).toBe("/login");
      fireEvent.press(screen.getByLabelText(`Open ${savedId}`));
      expect(mockPush).toHaveBeenLastCalledWith("/products");
      fireEvent.press(screen.getByText("Sign in to opt in"));
      expect(mockPush).toHaveBeenLastCalledWith("/login");
      expectNoAction();
    });

    it("does not answer on auth change and preserves a fresh deliberate Yes with actual-contract id", async () => {
      mockDiscoverPublicProductsAndTrials.mockResolvedValue({ items: [product] });
      const view = render(<DiscoverDirectory />);
      await screen.findByText("Sign in to opt in");
      expect(screen.getByRole("link").props.href).toBe(loginPath);
      expectNoAction();

      mockUser = { id: "viewer-1" };
      view.rerender(<DiscoverDirectory />);
      const yes = screen.getByLabelText(
        "yes — purchase interest for Canonical Interest Hat"
      );
      expect(screen.queryByText("Sign in to opt in")).toBeNull();
      expect(screen.getByText("Opt in to buy if this design is produced.")).toBeTruthy();
      expectNoAction();
      expect(mockPush).not.toHaveBeenCalled();

      fireEvent.press(yes);
      await waitFor(() =>
        expect(mockSubmitProductPurchaseIntent).toHaveBeenCalledWith(savedId, "yes")
      );
      expect(mockSubmitProductPurchaseIntent).toHaveBeenCalledTimes(1);
      expect(await screen.findByText("5 yes · goal 25")).toBeTruthy();
      expect(
        screen.getByText("Saved — you can change your answer while interest is open.")
      ).toBeTruthy();
      expect(screen.queryByText(/order created/i)).toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
      expectNoCheckoutOrClick();
    });

    it("preserves the trial anchor without adding a product response control", async () => {
      mockDiscoverPublicProductsAndTrials.mockResolvedValue({
        items: [
          {
            id: "trial-1",
            discoveryType: "trial",
            conceptTitle: "Public concept trial",
            storefrontSlug: "growpathai",
            publicHref: "/store/growpathai#product-trials",
            purchaseIntentEnabled: true
          }
        ]
      });
      render(<DiscoverDirectory />);
      await screen.findByLabelText("Open Public concept trial");
      expect(screen.queryByText("Sign in to opt in")).toBeNull();
      expect(screen.queryByText("25-customer production goal")).toBeNull();
      expect(mockLinkHrefs).toEqual([]);
      fireEvent.press(screen.getByLabelText("Open Public concept trial"));
      expect(mockPush).toHaveBeenLastCalledWith("/store/growpathai#product-trials");
      fireEvent.press(screen.getByLabelText("View all Products, Offers & Trials"));
      expect(mockPush).toHaveBeenLastCalledWith("/products");
      expectNoAction();
    });

    it("leaves statically loaded non-product cards and View all navigation unchanged", async () => {
      jest
        .requireMock("@/api/commercialFeed")
        .listCommercialFeedCampaigns.mockResolvedValue({
          items: [
            { id: "feed-1", title: "Community update" },
            {
              id: "promoted-1",
              title: "Promoted product campaign",
              linkedProductId: "promoted-product"
            },
            { id: "live-post-1", title: "Upcoming live", linkedLiveId: "live-1" }
          ]
        });
      jest
        .requireMock("@/api/storefront")
        .searchPublicStorefronts.mockResolvedValue([
          { id: "store-1", name: "GrowPathAI Store", slug: "growpathai" }
        ]);
      jest
        .requireMock("@/api/marketplace")
        .searchContent.mockResolvedValue([
          { id: "market-1", title: "Marketplace guide" }
        ]);
      render(<DiscoverDirectory />);
      await screen.findByLabelText("Open Community update");

      // This Jest host rejects the course dynamic import without VM module support;
      // preserve the exact course href helper check above instead of claiming a
      // rendered course-card journey here. The other cards render their real routes.
      const cards = [
        ["Open Community update", 0, "/feed?campaignId=feed-1"],
        ["Open Promoted product campaign", 0, "/feed?campaignId=promoted-1"],
        ["Open Upcoming live", 0, "/live-session?sessionId=live-1"],
        ["Open GrowPathAI Store", 0, "/store/growpathai"],
        ["Open GrowPathAI Store", 1, "/brands/growpathai"],
        ["Open Marketplace guide", 0, "/marketplace"],
        ["Open Tomato training", 0, "/videos/video-1"],
        ["Open Identify a Plant", 0, "/home/personal/tools/species-crop-id"],
        ["Open Explore Mapped Plant Findings", 0, "/field-observations"]
      ] as const;
      for (const [label, index, path] of cards) {
        fireEvent.press(screen.getAllByLabelText(label)[index]);
        expect(mockPush).toHaveBeenLastCalledWith(path);
      }
      const collections = [
        ["Discovery Nature", "/field-observations"],
        ["Feed", "/feed"],
        ["Videos", "/videos?tab=discover"],
        ["Storefronts", "/store"],
        ["Brands", "/store"],
        ["Products, Offers & Trials", "/products"],
        ["Marketplace", "/marketplace"],
        ["Courses", "/home/personal/courses"],
        ["Live opportunities", "/lives"]
      ];
      for (const [label, path] of collections) {
        fireEvent.press(screen.getByLabelText(`View all ${label}`));
        expect(mockPush).toHaveBeenLastCalledWith(path);
      }
      expectNoAction();
    });
  });

  it.each(["day", "night"] as const)(
    "uses the active %s palette for selected video filters",
    async (mode) => {
      mockThemeMode = mode;
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const filterStyles = createDiscoverVideoFilterStyles(palette);
      render(<DiscoverDirectory />);

      await waitFor(() => expect(screen.getByText("Tomato training")).toBeTruthy());
      expect(filterStyles.selectedButton).toEqual(
        expect.objectContaining({
          backgroundColor: palette.accent,
          borderColor: palette.accent
        })
      );
      expect(filterStyles.selectedText.color).toBe(palette.accentText);
      expect(StyleSheet.flatten(screen.getByText("All videos").props.style).color).toBe(
        palette.accentText
      );
      expect(
        StyleSheet.flatten(screen.getByText("Following only").props.style).color
      ).toBe(palette.textMuted);

      fireEvent.press(screen.getByLabelText("Show videos from people you follow"));
      await waitFor(() =>
        expect(
          StyleSheet.flatten(screen.getByText("Following only").props.style).color
        ).toBe(palette.accentText)
      );
      expect(StyleSheet.flatten(screen.getByText("All videos").props.style).color).toBe(
        palette.textMuted
      );
    }
  );
});
