import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ForumPostDetailRoute from "@/app/home/personal/(tabs)/forum/post/[id]";

const mockGetForumPost = jest.fn();
const mockListForumComments = jest.fn();
const mockAddForumComment = jest.fn();
const mockLikeForumPost = jest.fn();
const mockUnlikeForumPost = jest.fn();
const mockReportForumPost = jest.fn();
const mockSaveForumPostToGrowLog = jest.fn();
const mockCreatePersonalTask = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "post-1", growId: "grow-1" })
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref }: any) =>
      React.createElement(
        View,
        null,
        showBack
          ? React.createElement(Text, {
              accessibilityLabel: `Shared back ${backFallbackHref}`
            })
          : null,
        children
      )
  };
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

jest.mock("@/utils/photoUploads", () => ({
  resolveImageUri: (uri: string) => uri
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    FORUM_VIEW: "forum_view",
    FORUM_POST: "forum_post"
  },
  useEntitlements: () => ({
    can: () => true
  })
}));

jest.mock("@/api/communitySocial", () => ({
  addForumComment: (...args: any[]) => mockAddForumComment(...args),
  getForumPost: (...args: any[]) => mockGetForumPost(...args),
  likeForumPost: (...args: any[]) => mockLikeForumPost(...args),
  listForumComments: (...args: any[]) => mockListForumComments(...args),
  postId: (post: any) => String(post?.id || post?._id || ""),
  reportForumPost: (...args: any[]) => mockReportForumPost(...args),
  saveForumPostToGrowLog: (...args: any[]) => mockSaveForumPostToGrowLog(...args),
  unlikeForumPost: (...args: any[]) => mockUnlikeForumPost(...args)
}));

jest.mock("@/api/tasks", () => ({
  createPersonalTask: (...args: any[]) => mockCreatePersonalTask(...args)
}));

describe("ForumPostDetailRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetForumPost.mockResolvedValue({
      id: "post-1",
      title: "Leaf spot follow-up",
      body: "Check underside of leaves after lights on.",
      createdAt: "2026-07-07T12:00:00Z",
      author: { name: "Grow Mentor" },
      likeCount: 2,
      media: [{ storageUrl: "/uploads/forum-detail.jpg" }]
    });
    mockListForumComments.mockResolvedValue([
      {
        id: "comment-1",
        body: "Inspect again in three days and compare photos.",
        author: { name: "Soil Helper" }
      }
    ]);
    mockCreatePersonalTask.mockResolvedValue({ id: "task-1" });
    mockAddForumComment.mockResolvedValue({ id: "comment-new" });
  });

  it("creates a grow task from forum advice with the forum source link", async () => {
    const screen = render(<ForumPostDetailRoute />);

    await waitFor(() => expect(screen.getByText("Leaf spot follow-up")).toBeTruthy());
    expect(screen.getByLabelText("Shared back /forum")).toBeTruthy();
    expect(screen.getByLabelText("Forum post photo 1")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Create forum follow-up task"));

    await waitFor(() =>
      expect(mockCreatePersonalTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          linkedGrowId: "grow-1",
          title: "Follow up on forum advice: Leaf spot follow-up",
          description: expect.stringContaining("Created from a Forum/Q&A discussion"),
          priority: "medium",
          allDay: true,
          calendarType: "forum_followup",
          sourceStage: "forum_advice_review",
          sourceType: "forum",
          sourceObjectId: "post-1",
          linkedForumThreadId: "post-1",
          reminderPlan: { label: "24 hours before", channels: ["in_app"] }
        })
      )
    );
    expect(screen.getByText("Forum follow-up task created.")).toBeTruthy();
  });

  it("uses Forum member as the anonymous author fallback", async () => {
    mockGetForumPost.mockResolvedValueOnce({
      id: "post-1",
      title: "Anonymous forum question",
      body: "What should I check next?"
    });
    mockListForumComments.mockResolvedValueOnce([
      { id: "comment-1", body: "Check the underside of the leaves." }
    ]);

    const screen = render(<ForumPostDetailRoute />);

    await waitFor(() =>
      expect(screen.getByText("Anonymous forum question")).toBeTruthy()
    );

    expect(screen.getAllByText("Forum member").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Community member")).toBeNull();
  });

  it("keeps a held sales-language comment in the composer and explains review", async () => {
    mockAddForumComment.mockResolvedValueOnce({
      id: "held-comment",
      isHidden: true,
      moderationStatus: "held",
      moderationNotice: "This comment is hidden while a human moderator reviews it."
    });
    const screen = render(<ForumPostDetailRoute />);
    await waitFor(() => expect(screen.getByText("Leaf spot follow-up")).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Forum comment"),
      "Cannabis flower for sale. DM me for shipping."
    );
    fireEvent.press(screen.getByLabelText("Submit forum comment"));

    await waitFor(() =>
      expect(
        screen.getByText("This comment is hidden while a human moderator reviews it.")
      ).toBeTruthy()
    );
    expect(screen.getByLabelText("Forum comment").props.value).toContain("for sale");
    expect(mockListForumComments).toHaveBeenCalledTimes(1);
  });
});
