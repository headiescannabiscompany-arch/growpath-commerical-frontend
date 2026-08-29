import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockSearchVideos = jest.fn();
const mockListPublicFieldObservations = jest.fn();
const mockDiscoverPublicProductsAndTrials = jest.fn();
let mockThemeMode: "day" | "night" = "night";
let mockWorkspaceMode: "personal" | "commercial" | "facility" = "personal";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
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
          id: "hat-1",
          discoveryType: "product",
          name: "Night Script Cord",
          shortDescription: "Navy corduroy hat",
          imageUrl: "https://cdn.example.com/night-script.png",
          storefrontName: "GrowPathAI",
          storefrontSlug: "growpathai",
          publicHref: "/store/growpathai/products/hat-1"
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
    expect(mockPush).toHaveBeenCalledWith("/store/growpathai/products/hat-1");
    fireEvent.press(screen.getByLabelText("Open GrowPathAI Circuit Leaf — Midnight"));
    expect(mockPush).toHaveBeenCalledWith("/store/growpathai#product-trials");
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
