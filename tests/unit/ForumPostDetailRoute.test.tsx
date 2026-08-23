import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ForumPostDetailRoute from "@/app/home/personal/(tabs)/forum/post/[id]";

const mockGetForumPost = jest.fn();
const mockListForumComments = jest.fn();
const mockAddForumComment = jest.fn();
const mockDeleteForumComment = jest.fn();
const mockDeleteForumPost = jest.fn();
const mockLikeForumPost = jest.fn();
const mockUnlikeForumPost = jest.fn();
const mockReportForumPost = jest.fn();
const mockSaveForumPostToGrowLog = jest.fn();
const mockUpdateForumPost = jest.fn();
const mockUpdateForumComment = jest.fn();
const mockRouterReplace = jest.fn();
const mockCreatePersonalTask = jest.fn();
let mockParams: Record<string, string> = { id: "post-1", growId: "grow-1" };

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ href, children }: any) =>
      React.cloneElement(React.Children.only(children), {
        href,
        testID: `forum-link-${href}`
      }),
    useLocalSearchParams: () => mockParams,
    useRouter: () => ({ replace: mockRouterReplace })
  };
});

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

jest.mock("@/components/FollowButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ userId }: any) =>
    React.createElement(
      Text,
      { accessibilityLabel: `Follow author ${userId}` },
      "Follow"
    );
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

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    isAuthed: true,
    user: {
      id: "viewer-1",
      username: "EtGU_Jay",
      email: "viewer@example.com"
    }
  })
}));

jest.mock("@/api/communitySocial", () => ({
  addForumComment: (...args: any[]) => mockAddForumComment(...args),
  deleteForumComment: (...args: any[]) => mockDeleteForumComment(...args),
  deleteForumPost: (...args: any[]) => mockDeleteForumPost(...args),
  getForumPost: (...args: any[]) => mockGetForumPost(...args),
  likeForumPost: (...args: any[]) => mockLikeForumPost(...args),
  listForumComments: (...args: any[]) => mockListForumComments(...args),
  postId: (post: any) => String(post?.id || post?._id || ""),
  reportForumPost: (...args: any[]) => mockReportForumPost(...args),
  saveForumPostToGrowLog: (...args: any[]) => mockSaveForumPostToGrowLog(...args),
  unlikeForumPost: (...args: any[]) => mockUnlikeForumPost(...args),
  updateForumComment: (...args: any[]) => mockUpdateForumComment(...args),
  updateForumPost: (...args: any[]) => mockUpdateForumPost(...args)
}));

jest.mock("@/api/tasks", () => ({
  createPersonalTask: (...args: any[]) => mockCreatePersonalTask(...args)
}));

describe("ForumPostDetailRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParams = { id: "post-1", growId: "grow-1" };
    mockGetForumPost.mockResolvedValue({
      id: "post-1",
      title: "Leaf spot follow-up",
      body: "Check underside of leaves after lights on.",
      createdAt: "2026-07-07T12:00:00Z",
      author: { id: "author-1", name: "Grow Mentor" },
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
    mockDeleteForumComment.mockResolvedValue({ ok: true });
    mockDeleteForumPost.mockResolvedValue({ deleted: true });
    mockUpdateForumPost.mockImplementation(async (_id, data) => ({
      id: "post-1",
      title: data.title,
      body: data.body,
      author: { username: "EtGU_Jay" }
    }));
    mockUpdateForumComment.mockImplementation(async (_id, text) => ({
      id: "comment-owner",
      text
    }));
  });

  it("shows an action-free handoff when no post id is present", async () => {
    mockParams = {};
    const screen = render(<ForumPostDetailRoute />);

    await waitFor(() =>
      expect(screen.getByText("Choose a discussion from Forum / Q&A.")).toBeTruthy()
    );
    expect(mockGetForumPost).not.toHaveBeenCalled();
    expect(mockListForumComments).not.toHaveBeenCalled();
    expect(
      screen.getByRole("header", { name: "Forum discussion unavailable" })
    ).toHaveProp("aria-level", 1);
    const browseForum = screen.getByTestId("forum-link-/forum");
    expect(browseForum).toBeTruthy();
    expect(Array.isArray(browseForum.props.style)).toBe(false);
    expect(screen.queryByLabelText("Forum comment")).toBeNull();
    expect(screen.queryByLabelText("Attach forum comment photos")).toBeNull();
    expect(screen.queryByLabelText("Submit forum comment")).toBeNull();
  });

  it("sanitizes detail-load failures and hides the composer", async () => {
    mockGetForumPost.mockRejectedValueOnce(
      new Error('Cast to ObjectId failed at path "_id" for model "ForumPost"')
    );
    const screen = render(<ForumPostDetailRoute />);

    await waitFor(() =>
      expect(screen.getByText("This discussion is unavailable.")).toBeTruthy()
    );
    expect(screen.queryByText(/Cast to ObjectId/i)).toBeNull();
    expect(screen.queryByLabelText("Forum comment")).toBeNull();
    expect(screen.getByTestId("forum-link-/forum")).toBeTruthy();
  });

  it("creates a grow task from forum advice with the forum source link", async () => {
    const screen = render(<ForumPostDetailRoute />);

    await waitFor(() => expect(screen.getByText("Leaf spot follow-up")).toBeTruthy());
    expect(screen.getByRole("header", { name: "Leaf spot follow-up" })).toHaveProp(
      "aria-level",
      1
    );
    expect(screen.getByRole("header", { name: "Comments" })).toHaveProp("aria-level", 2);
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

  it("hides self-reporting and exposes confirmed deletion for the owner's comment", async () => {
    mockGetForumPost.mockResolvedValueOnce({
      id: "post-1",
      title: "Owner post",
      author: { username: "EtGU_Jay" }
    });
    mockListForumComments.mockResolvedValueOnce([
      {
        id: "comment-owner",
        body: "My correction",
        user: { id: "viewer-1", username: "EtGU_Jay" }
      }
    ]);
    const alert = jest
      .spyOn(require("react-native").Alert, "alert")
      .mockImplementation((...args: unknown[]) => {
        const buttons = args[2] as any[];
        buttons.find((button) => button.text === "Delete")?.onPress();
      });

    const screen = render(<ForumPostDetailRoute />);
    await waitFor(() => expect(screen.getByText("Owner post")).toBeTruthy());

    expect(screen.getByText("Your post")).toBeTruthy();
    expect(screen.getByLabelText("Edit your forum post")).toBeTruthy();
    expect(screen.getByLabelText("Delete your forum post")).toBeTruthy();
    expect(screen.queryByLabelText("Report forum post")).toBeNull();
    expect(screen.queryByLabelText("Report forum comment")).toBeNull();
    fireEvent.press(screen.getByLabelText("Delete your comment"));

    await waitFor(() =>
      expect(mockDeleteForumComment).toHaveBeenCalledWith("comment-owner")
    );
    expect(screen.getByText("Comment deleted.")).toBeTruthy();
    alert.mockRestore();
  });

  it("edits an owned post without exposing workspace or visibility controls", async () => {
    mockGetForumPost.mockResolvedValueOnce({
      id: "post-1",
      title: "Owner post",
      body: "Original copy",
      author: { username: "EtGU_Jay" }
    });
    mockListForumComments.mockResolvedValueOnce([]);
    const screen = render(<ForumPostDetailRoute />);
    await waitFor(() => expect(screen.getByText("Owner post")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Edit your forum post"));
    expect(screen.queryByLabelText(/visibility/i)).toBeNull();
    fireEvent.changeText(screen.getByLabelText("Edit forum post title"), "Revised");
    fireEvent.changeText(screen.getByLabelText("Edit forum post body"), "Revised copy");
    fireEvent.press(screen.getByLabelText("Save forum post changes"));

    await waitFor(() =>
      expect(mockUpdateForumPost).toHaveBeenCalledWith("post-1", {
        title: "Revised",
        body: "Revised copy"
      })
    );
    expect(screen.getByText("Post updated.")).toBeTruthy();
  });

  it("confirms owner post deletion before returning to Forum", async () => {
    mockGetForumPost.mockResolvedValueOnce({
      id: "post-1",
      title: "Owner post",
      author: { username: "EtGU_Jay" }
    });
    const alert = jest
      .spyOn(require("react-native").Alert, "alert")
      .mockImplementation((...args: unknown[]) => {
        const buttons = args[2] as any[];
        buttons.find((button) => button.text === "Delete")?.onPress();
      });
    const screen = render(<ForumPostDetailRoute />);
    await waitFor(() => expect(screen.getByText("Owner post")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Delete your forum post"));

    await waitFor(() => expect(mockDeleteForumPost).toHaveBeenCalledWith("post-1"));
    expect(mockRouterReplace).toHaveBeenCalledWith("/forum");
    alert.mockRestore();
  });

  it("keeps report controls for content owned by another member", async () => {
    const screen = render(<ForumPostDetailRoute />);
    await waitFor(() => expect(screen.getByText("Leaf spot follow-up")).toBeTruthy());

    expect(screen.getByLabelText("Report forum post")).toBeTruthy();
    expect(screen.getByLabelText("Follow author author-1")).toBeTruthy();
    expect(screen.getByLabelText("Report forum comment")).toBeTruthy();
    expect(screen.queryByLabelText("Delete your comment")).toBeNull();
  });

  it("replies to a visible comment with its parent id", async () => {
    const screen = render(<ForumPostDetailRoute />);
    await waitFor(() => expect(screen.getByText("Leaf spot follow-up")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Reply to Soil Helper"));
    expect(screen.getByText("Replying to Soil Helper")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Forum comment"), "Follow-up detail");
    fireEvent.press(screen.getByLabelText("Submit forum comment"));

    await waitFor(() =>
      expect(mockAddForumComment).toHaveBeenCalledWith(
        "post-1",
        "Follow-up detail",
        [],
        "comment-1"
      )
    );
  });

  it("edits an owned comment and keeps delete available", async () => {
    mockGetForumPost.mockResolvedValueOnce({
      id: "post-1",
      title: "Owner post",
      author: { username: "EtGU_Jay" }
    });
    mockListForumComments.mockResolvedValueOnce([
      {
        id: "comment-owner",
        body: "Original comment",
        user: { id: "viewer-1" }
      }
    ]);
    const screen = render(<ForumPostDetailRoute />);
    await waitFor(() => expect(screen.getByText("Original comment")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Edit your comment"));
    fireEvent.changeText(screen.getByLabelText("Edit forum comment"), "Revised comment");
    fireEvent.press(screen.getByLabelText("Save forum comment changes"));

    await waitFor(() =>
      expect(mockUpdateForumComment).toHaveBeenCalledWith(
        "comment-owner",
        "Revised comment"
      )
    );
    expect(screen.getByText("Comment updated.")).toBeTruthy();
    expect(screen.getByLabelText("Delete your comment")).toBeTruthy();
  });
});
