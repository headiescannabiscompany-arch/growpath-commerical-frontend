import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommunitiesDirectoryRoute from "@/app/communities";
import CommunityTab from "@/app/home/personal/(tabs)/community";
import ForumRoute from "@/app/home/personal/(tabs)/forum";
import ForumCodeRoute from "@/app/home/personal/(tabs)/forum/code";
import ForumNewPostRoute from "@/app/home/personal/(tabs)/forum/new-post";

const mockListForumPosts = jest.fn();
const mockListGuilds = jest.fn();
const mockListNotifications = jest.fn();
const mockCreateForumPost = jest.fn();
const mockReplace = jest.fn();
let mockGrowInterests: Record<string, string[]> = {};

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Link: ({ children, href }: { children: React.ReactNode; href: any }) => {
      const value =
        typeof href === "string"
          ? href
          : `${href.pathname}?${new URLSearchParams(href.params || {}).toString()}`;
      return React.createElement(
        Text,
        { testID: `link-${value}`, accessibilityLabel: `link-${value}` },
        children
      );
    },
    useRouter: () => ({
      back: jest.fn(),
      push: jest.fn(),
      replace: mockReplace
    }),
    usePathname: () => "/forum",
    useLocalSearchParams: () => ({})
  };
});

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" }
}));

jest.mock("@/api/communitySocial", () => ({
  listForumPosts: (...args: any[]) => mockListForumPosts(...args),
  listGuilds: (...args: any[]) => mockListGuilds(...args),
  listNotifications: (...args: any[]) => mockListNotifications(...args),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
  joinGuild: jest.fn(),
  leaveGuild: jest.fn(),
  createForumPost: (...args: any[]) => mockCreateForumPost(...args),
  postId: (post: any) => post.id || post._id || post.title
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "grower@growpathai.com",
      growInterests: mockGrowInterests
    }
  })
}));

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref, name }: any) =>
      React.createElement(
        View,
        { testID: `screen-boundary-${name || "unknown"}` },
        showBack
          ? React.createElement(
              Text,
              { accessibilityLabel: `Shared back ${backFallbackHref}` },
              `Shared Back ${backFallbackHref}`
            )
          : null,
        children
      )
  };
});

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, header }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    FORUM_VIEW: "forum_view",
    FORUM_POST: "forum_post"
  },
  useEntitlements: () => ({
    mode: "personal",
    can: () => true
  })
}));

describe("Forum and feed separation copy", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListForumPosts.mockResolvedValue([]);
    mockListGuilds.mockResolvedValue([]);
    mockListNotifications.mockResolvedValue([]);
    mockCreateForumPost.mockResolvedValue({ id: "thread-new" });
    mockGrowInterests = { crops: ["Cannabis"], environment: ["Indoor"] };
  });

  it("frames the forum as discussion while feed placements stay campaigns", async () => {
    const screen = render(<ForumRoute />);

    await waitFor(() => expect(mockListForumPosts).toHaveBeenCalled());
    expect(screen.getByText("Forum / Q&A")).toBeTruthy();
    expect(screen.getByText("New Discussion")).toBeTruthy();
    expect(screen.getByText("Forum Feed")).toBeTruthy();
    expect(screen.getByText(/tagged by grow interests/)).toBeTruthy();
    expect(screen.getByText(/Discussion, Q&A, grow help/)).toBeTruthy();
    expect(screen.getByText(/campaign ads, not forum threads/)).toBeTruthy();
  });

  it("shows a retryable forum error instead of an empty feed", async () => {
    mockListForumPosts.mockRejectedValueOnce(new Error("Network down"));
    const screen = render(<ForumRoute />);

    await waitFor(() => expect(screen.getByText("Forum could not load")).toBeTruthy());
    expect(screen.getByText("Network down")).toBeTruthy();
    expect(screen.getByLabelText("Retry loading forum posts")).toBeTruthy();
    expect(screen.queryByText("No posts yet.")).toBeNull();
  });

  it("keeps the new forum post composer out of Feed / Campaigns", () => {
    const screen = render(<ForumNewPostRoute />);

    expect(screen.getByText("Shared Back /forum")).toBeTruthy();
    expect(screen.getByText("New Discussion")).toBeTruthy();
    expect(screen.getByText("Posting as User")).toBeTruthy();
    expect(screen.getByText("Workspace: personal")).toBeTruthy();
    expect(screen.getByText("Post audience — Grow Interests")).toBeTruthy();
    expect(screen.getByText(/Tier 1: What You Grow/)).toBeTruthy();
    expect(screen.getByText(/Environment/)).toBeTruthy();
    expect(screen.getByText(/Create a forum discussion or Q&A post/)).toBeTruthy();
    expect(screen.getByText(/promotions belong in Feed \/ Campaigns/)).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Write your question or discussion...")
    ).toBeTruthy();
  });

  it("stores personal forum posts with user author identity", async () => {
    const screen = render(<ForumNewPostRoute />);

    fireEvent.changeText(screen.getByLabelText("Forum post title"), "Leaf edges");
    fireEvent.changeText(
      screen.getByLabelText("Forum post body"),
      "What changed before this issue?"
    );
    expect(screen.getByLabelText("Toggle grow interest Cannabis")).toBeTruthy();
    expect(screen.getByLabelText("Toggle grow interest Indoor")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Publish forum post"));

    await waitFor(() =>
      expect(mockCreateForumPost).toHaveBeenCalledWith({
        title: "Leaf edges",
        body: "What changed before this issue?",
        authorType: "user",
        authorId: "user-1",
        workspaceContext: "personal",
        photos: [],
        tags: ["Cannabis"],
        growInterests: ["Cannabis"]
      })
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/forum/post",
      params: { id: "thread-new" }
    });
  });

  it("keeps forum guidelines as a nested forum page with shared back behavior", () => {
    const screen = render(<ForumCodeRoute />);

    expect(screen.getByText("Shared Back /forum")).toBeTruthy();
    expect(screen.getByText("Forum Guidelines")).toBeTruthy();
  });

  it("labels the legacy communities route as a Forum/Q&A directory", async () => {
    mockListGuilds.mockResolvedValue([
      {
        id: "soil-group",
        name: "Living Soil Q&A",
        description: "Discussion for soil recipes and amendment timing.",
        memberCount: 8
      }
    ]);

    const screen = render(<CommunitiesDirectoryRoute />);

    await waitFor(() => expect(mockListGuilds).toHaveBeenCalled());
    expect(screen.getByText("Forum Directory")).toBeTruthy();
    expect(
      screen.getByText(/Browse discussion groups by crop and workflow/)
    ).toBeTruthy();
    expect(screen.getByLabelText("Search forum groups")).toBeTruthy();
    expect(screen.getByText("Groups")).toBeTruthy();
    expect(screen.getByText("Join Group")).toBeTruthy();
    expect(screen.queryByText("Communities")).toBeNull();
    expect(screen.queryByText("Search communities")).toBeNull();
  });

  it("uses forum group fallback copy in the shared directory", async () => {
    mockListGuilds.mockResolvedValue([
      {
        id: "unnamed-group",
        name: "",
        description: "A sparse backend forum group row.",
        memberCount: 0
      }
    ]);

    const screen = render(<CommunitiesDirectoryRoute />);

    await waitFor(() => expect(mockListGuilds).toHaveBeenCalled());
    expect(screen.getByText("Forum group")).toBeTruthy();
    expect(screen.queryByText("Guild")).toBeNull();
  });

  it("opens personal forum list posts through the shared forum detail route", async () => {
    mockListForumPosts.mockResolvedValue([
      {
        id: "thread-grow-help",
        title: "Leaf help",
        body: "What changed?",
        growInterests: ["Cannabis", "Indoor"],
        attachments: [{ url: "/uploads/forum-leaf.jpg" }]
      }
    ]);

    const screen = render(<ForumRoute />);

    await waitFor(() =>
      expect(screen.getByTestId("link-/forum/post?id=thread-grow-help")).toBeTruthy()
    );
    expect(screen.getByText("Cannabis")).toBeTruthy();
    expect(screen.getByText("Indoor")).toBeTruthy();
    const photo = screen.getByLabelText("Expand forum post photo 1");
    expect(photo).toBeTruthy();
    fireEvent.press(photo);
    expect(screen.getByLabelText("Close expanded forum photo")).toBeTruthy();
  });

  it("defaults to matching grow interests while keeping an all-discussions escape hatch", async () => {
    mockGrowInterests = { crops: ["Fruit Trees"], environment: ["Outdoor"] };
    mockListForumPosts.mockResolvedValue([
      {
        id: "orchard",
        title: "Apple pruning",
        growInterests: { crops: ["Fruit Trees"] }
      },
      { id: "cannabis", title: "Indoor cannabis", growInterests: { crops: ["Cannabis"] } }
    ]);

    const screen = render(<ForumRoute />);
    await waitFor(() => expect(screen.getByText("Apple pruning")).toBeTruthy());
    expect(screen.queryByText("Indoor cannabis")).toBeNull();

    fireEvent.press(screen.getByLabelText("Show all forum posts"));
    expect(screen.getByText("Indoor cannabis")).toBeTruthy();
  });

  it("opens community forum previews through the shared forum detail route", async () => {
    mockListForumPosts.mockResolvedValue([
      { id: "thread-community-help", title: "Community help", body: "Need advice" }
    ]);

    const screen = render(<CommunityTab />);

    await waitFor(() =>
      expect(screen.getByTestId("link-/forum/post?id=thread-community-help")).toBeTruthy()
    );
    expect(screen.getByLabelText("Public Storefronts")).toBeTruthy();
    expect(screen.getByLabelText("Chronological Feed")).toBeTruthy();
    expect(screen.getByLabelText("Marketplace & Offers")).toBeTruthy();
    expect(screen.getByLabelText("Browse Discovery Directory")).toBeTruthy();
  });

  it("uses forum group wording for personal membership fallbacks", async () => {
    const screen = render(<CommunityTab />);

    await waitFor(() => expect(mockListGuilds).toHaveBeenCalled());
    expect(screen.getByText("No forum groups returned.")).toBeTruthy();
    expect(screen.queryByText("No guilds returned.")).toBeNull();
  });
});
