import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import CommunityTab from "@/app/home/personal/(tabs)/community";
import ForumRoute from "@/app/home/personal/(tabs)/forum";
import ForumCodeRoute from "@/app/home/personal/(tabs)/forum/code";
import ForumNewPostRoute from "@/app/home/personal/(tabs)/forum/new-post";

const mockListForumPosts = jest.fn();
const mockListGuilds = jest.fn();
const mockListNotifications = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
      React.createElement(
        Text,
        { testID: `link-${href}`, accessibilityLabel: `link-${href}` },
        children
      ),
    useRouter: () => ({
      back: jest.fn(),
      replace: jest.fn()
    })
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
  createForumPost: jest.fn(),
  postId: (post: any) => post.id || post._id || post.title
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

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    FORUM_VIEW: "forum_view",
    FORUM_POST: "forum_post"
  },
  useEntitlements: () => ({
    can: () => true
  })
}));

describe("Forum and feed separation copy", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListForumPosts.mockResolvedValue([]);
    mockListGuilds.mockResolvedValue([]);
    mockListNotifications.mockResolvedValue([]);
  });

  it("frames the forum as discussion while feed placements stay campaigns", async () => {
    const screen = render(<ForumRoute />);

    await waitFor(() => expect(mockListForumPosts).toHaveBeenCalled());
    expect(screen.getByText("Forum")).toBeTruthy();
    expect(screen.getByText(/Discussion, Q&A, grow help/)).toBeTruthy();
    expect(screen.getByText(/campaign ads, not forum threads/)).toBeTruthy();
  });

  it("keeps the new forum post composer out of Feed / Campaigns", () => {
    const screen = render(<ForumNewPostRoute />);

    expect(screen.getByText("Shared Back /home/personal/forum")).toBeTruthy();
    expect(screen.getByText("New Discussion")).toBeTruthy();
    expect(screen.getByText(/Create a forum discussion or Q&A post/)).toBeTruthy();
    expect(screen.getByText(/promotions belong in Feed \/ Campaigns/)).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Write your question or discussion...")
    ).toBeTruthy();
  });

  it("keeps forum guidelines as a nested forum page with shared back behavior", () => {
    const screen = render(<ForumCodeRoute />);

    expect(screen.getByText("Shared Back /home/personal/forum")).toBeTruthy();
    expect(screen.getByText("Forum Guidelines")).toBeTruthy();
  });

  it("opens personal forum list posts through the shared forum detail route", async () => {
    mockListForumPosts.mockResolvedValue([
      { id: "thread-grow-help", title: "Leaf help", body: "What changed?" }
    ]);

    const screen = render(<ForumRoute />);

    await waitFor(() =>
      expect(screen.getByTestId("link-/forum/post/thread-grow-help")).toBeTruthy()
    );
  });

  it("opens community forum previews through the shared forum detail route", async () => {
    mockListForumPosts.mockResolvedValue([
      { id: "thread-community-help", title: "Community help", body: "Need advice" }
    ]);

    const screen = render(<CommunityTab />);

    await waitFor(() =>
      expect(screen.getByTestId("link-/forum/post/thread-community-help")).toBeTruthy()
    );
  });
});
