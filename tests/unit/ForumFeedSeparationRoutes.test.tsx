import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import ForumRoute from "@/app/home/personal/(tabs)/forum";
import ForumNewPostRoute from "@/app/home/personal/(tabs)/forum/new-post";

const mockListForumPosts = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: { children: React.ReactNode }) => children,
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
  createForumPost: jest.fn(),
  postId: (post: any) => post.id || post._id || post.title
}));

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
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

    expect(screen.getByText("New Discussion")).toBeTruthy();
    expect(screen.getByText(/Create a forum discussion or Q&A post/)).toBeTruthy();
    expect(screen.getByText(/promotions belong in Feed \/ Campaigns/)).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Write your question or discussion...")
    ).toBeTruthy();
  });
});
