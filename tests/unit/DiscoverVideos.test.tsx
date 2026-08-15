import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockSearchVideos = jest.fn();
let mockThemeMode: "day" | "night" = "night";
let mockWorkspaceMode: "personal" | "commercial" = "personal";

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
  searchPublicStorefronts: jest.fn(async () => [])
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
  discoverCourseHref,
  discoverImageOf,
  discoverLiveHref
} from "@/app/discover";
import { getThemePalette } from "@/theme/appTheme";

describe("Discover video search", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSearchVideos.mockReset();
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
  });

  it("resolves available discovery art and exact course/live destinations", () => {
    expect(
      discoverImageOf({ bannerImageUrl: "https://cdn.example.com/store.jpg" })
    ).toBe("https://cdn.example.com/store.jpg");
    expect(discoverCourseHref({ id: "course / 1" })).toBe(
      "/courses?courseId=course%20%2F%201"
    );
    expect(discoverLiveHref({ linkedLiveId: "live / 1" })).toBe(
      "/live-session?sessionId=live%20%2F%201"
    );
  });

  it("routes non-personal workspaces through the workspace switcher for Plant ID", async () => {
    mockWorkspaceMode = "commercial";
    render(<DiscoverDirectory />);

    await waitFor(() =>
      expect(screen.getByText("Switch to Personal for Plant ID")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Open Switch to Personal for Plant ID"));
    expect(mockPush).toHaveBeenCalledWith("/account/mode");
  });

  it("shows accessible videos as a first-class Discover section", async () => {
    render(<DiscoverDirectory />);

    await waitFor(() => {
      expect(screen.getByText("Tomato training")).toBeTruthy();
    });
    expect(screen.getByText("Videos")).toBeTruthy();
    expect(screen.getAllByText("Discovery Nature")).toHaveLength(1);
    expect(screen.getByText("Identify a Plant")).toBeTruthy();
    expect(screen.getByText("Explore Mapped Plant Findings")).toBeTruthy();
    expect(screen.queryByLabelText("Loading globe preview")).toBeNull();
    expect(screen.queryByLabelText("Open Discovery Nature globe")).toBeNull();
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
