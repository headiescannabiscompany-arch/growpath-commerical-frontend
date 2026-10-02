import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import VideoDetailRoute from "@/app/videos/[videoId]";

const mockGetVideo = jest.fn();
const mockListVideoComments = jest.fn();
const mockUpdateVideo = jest.fn();
const mockPersistImageUri = jest.fn();
const mockRequestMediaLibraryPermissions = jest.fn();
const mockLaunchImageLibrary = jest.fn();
let mockReportProps: any = null;
let mockLessonMediaCardProps: any = null;
let mockAppPageProps: any = null;
let mockPublicShareProps: any = null;
let mockUserId = "viewer-1";
let mockVideoId = "video-1";
let mockAuthed = true;
let mockReady = true;
let mockHydrating = false;
let mockFacilityId: string | null = null;
const mockRetryMe = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ videoId: mockVideoId }),
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    isAuthed: mockAuthed,
    isHydrating: mockHydrating,
    retryMe: mockRetryMe,
    user: { id: mockUserId, _id: mockUserId }
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    ready: mockReady,
    mode: "personal",
    facilityId: mockFacilityId
  })
}));

jest.mock("@/api/videos", () => ({
  getVideo: (...args: any[]) => mockGetVideo(...args),
  listVideoComments: (...args: any[]) => mockListVideoComments(...args),
  updateVideo: (...args: any[]) => mockUpdateVideo(...args),
  createVideoComment: jest.fn(),
  deleteVideoComment: jest.fn()
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUri: (...args: any[]) => mockPersistImageUri(...args),
  resolveImageUri: (value: string) => value
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    mockRequestMediaLibraryPermissions(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibrary(...args)
}));

jest.mock("@/components/sharing/PublicShareActions", () => ({
  __esModule: true,
  default: (props: any) => {
    mockPublicShareProps = props;
    return null;
  }
}));

jest.mock("@/components/FollowButton", () => () => null);
jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));
jest.mock("@/components/ReportModal", () => ({
  __esModule: true,
  default: (props: any) => {
    if (props.visible) mockReportProps = props;
    return null;
  }
}));
jest.mock("@/components/learning/LessonMediaCard", () => ({
  __esModule: true,
  default: (props: any) => {
    mockLessonMediaCardProps = props;
    return null;
  }
}));
jest.mock("@/components/layout/AppCard", () => ({
  __esModule: true,
  default: ({ children }: any) => {
    const { View } = require("react-native");
    return <View>{children}</View>;
  }
}));
jest.mock("@/components/layout/AppPage", () => ({
  __esModule: true,
  default: (props: any) => {
    mockAppPageProps = props;
    const { Text, View } = require("react-native");
    return (
      <View>
        <Text accessibilityLabel={`Shared back ${props.backFallbackHref}`}>Back</Text>
        {props.header}
        {props.children}
      </View>
    );
  }
}));

const video = {
  id: "video-1",
  title: "Living soil walkthrough",
  description: "A reusable public video.",
  status: "published",
  visibility: "public",
  workspaceType: "commercial",
  owner: {
    id: "owner-1",
    displayName: "Living Soil Labs",
    workspaceType: "commercial"
  },
  mediaSource: { sourceType: "external", canonicalUrl: "https://example.com/video" },
  thumbnailUrl: "",
  durationSeconds: 90,
  tags: [],
  growInterests: [],
  cannabisSpecific: false,
  socialPreviewUrl:
    "https://api.growpathai.com/api/videos/64b7f0a1c2d3e4f567890123/share?v=abc"
};

describe("VideoDetailRoute reporting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReportProps = null;
    mockLessonMediaCardProps = null;
    mockAppPageProps = null;
    mockPublicShareProps = null;
    mockUserId = "viewer-1";
    mockVideoId = "video-1";
    mockAuthed = true;
    mockReady = true;
    mockHydrating = false;
    mockFacilityId = null;
    mockGetVideo.mockReset();
    mockListVideoComments.mockReset();
    mockGetVideo.mockResolvedValue(video);
    mockListVideoComments.mockResolvedValue([]);
    mockPersistImageUri.mockResolvedValue("/uploads/video-thumbnails/selected.jpg");
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: true });
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///selected-thumbnail.jpg" }]
    });
    mockUpdateVideo.mockResolvedValue({
      video: { ...video, thumbnailUrl: "/uploads/video-thumbnails/selected.jpg" }
    });
  });

  it("waits for access readiness before video and discussion reads", async () => {
    mockHydrating = true;
    mockReady = false;
    const view = render(<VideoDetailRoute />);
    expect(mockGetVideo).not.toHaveBeenCalled();
    expect(mockListVideoComments).not.toHaveBeenCalled();
    mockHydrating = false;
    mockReady = true;
    view.rerender(<VideoDetailRoute />);
    await screen.findByText(video.title);
  });

  it("offers a single-flight video retry and does not request comments before access succeeds", async () => {
    mockGetVideo.mockRejectedValueOnce(new Error("offline"));
    let finish: (value: any) => void = () => {};
    mockGetVideo.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    render(<VideoDetailRoute />);
    await screen.findByText("Video unavailable");
    expect(mockListVideoComments).not.toHaveBeenCalled();
    const retry = screen.getByLabelText("Retry video");
    fireEvent.press(retry);
    fireEvent.press(retry);
    expect(mockGetVideo).toHaveBeenCalledTimes(2);
    await act(async () => finish(video));
    await screen.findByText(video.title);
    await waitFor(() => expect(mockListVideoComments).toHaveBeenCalledTimes(1));
  });

  it.each(["account", "video", "facility", "signout"])(
    "removes earlier video and composer immediately after %s changes",
    async (change) => {
      mockGetVideo.mockResolvedValueOnce(video);
      mockGetVideo.mockImplementationOnce(() => new Promise(() => {}));
      const view = render(<VideoDetailRoute />);
      await screen.findByText(video.title);
      fireEvent.changeText(
        screen.getByLabelText("Write a video comment"),
        "Private unfinished comment"
      );
      if (change === "account") mockUserId = "another-viewer";
      if (change === "video") mockVideoId = "video-2";
      if (change === "facility") mockFacilityId = "facility-2";
      if (change === "signout") {
        mockUserId = "";
        mockAuthed = false;
      }
      view.rerender(<VideoDetailRoute />);
      expect(screen.queryByText(video.title)).toBeNull();
      expect(screen.queryByDisplayValue("Private unfinished comment")).toBeNull();
      expect(mockGetVideo).toHaveBeenCalledTimes(2);
    }
  );

  it("retries failed comments without claiming an empty discussion or losing the composer", async () => {
    mockListVideoComments.mockRejectedValueOnce(new Error("discussion offline"));
    mockListVideoComments.mockResolvedValueOnce([]);
    render(<VideoDetailRoute />);
    await screen.findByText("Discussion unavailable");
    expect(screen.queryByText("No comments yet. Start the discussion.")).toBeNull();
    fireEvent.changeText(screen.getByLabelText("Write a video comment"), "Keep my draft");
    fireEvent.press(screen.getByLabelText("Retry video discussion"));
    await screen.findByText("No comments yet. Start the discussion.");
    expect(screen.getByDisplayValue("Keep my draft")).toBeTruthy();
    expect(mockGetVideo).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty or mismatched video payload without mounting media or sharing", async () => {
    mockGetVideo.mockResolvedValue({ ...video, id: "wrong-id" });
    render(<VideoDetailRoute />);
    await screen.findByText("Video unavailable");
    expect(mockLessonMediaCardProps).toBeNull();
    expect(mockPublicShareProps).toBeNull();
    expect(mockListVideoComments).not.toHaveBeenCalled();
  });

  it("discards a late previous-account video response", async () => {
    let finishOld: (value: any) => void = () => {};
    mockGetVideo.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        })
    );
    mockGetVideo.mockResolvedValueOnce({ ...video, title: "Current account video" });
    const view = render(<VideoDetailRoute />);
    mockUserId = "another-viewer";
    view.rerender(<VideoDetailRoute />);
    await screen.findByText("Current account video");
    await act(async () => finishOld(video));
    expect(screen.queryByText(video.title)).toBeNull();
    expect(screen.getByText("Current account video")).toBeTruthy();
  });

  it("discards a late previous-video discussion and keeps the share target current", async () => {
    let finishOld: (value: any) => void = () => {};
    mockListVideoComments.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        })
    );
    mockGetVideo.mockResolvedValueOnce(video);
    mockGetVideo.mockResolvedValueOnce({
      ...video,
      id: "video-2",
      title: "Second video",
      socialPreviewUrl: "https://api.growpathai.com/api/videos/video-2/share?v=new"
    });
    const view = render(<VideoDetailRoute />);
    await screen.findByText(video.title);
    await waitFor(() => expect(mockListVideoComments).toHaveBeenCalledTimes(1));
    mockVideoId = "video-2";
    view.rerender(<VideoDetailRoute />);
    await screen.findByText("Second video");
    await act(async () =>
      finishOld([
        {
          id: "old-comment",
          body: "Old private comment",
          author: { id: "old", displayName: "Old viewer" }
        }
      ])
    );
    expect(screen.queryByText("Old private comment")).toBeNull();
    expect(mockPublicShareProps).toEqual(
      expect.objectContaining({
        path: "/videos/video-2",
        socialPreviewUrl: "https://api.growpathai.com/api/videos/video-2/share?v=new"
      })
    );
  });

  it("keeps signed-out video discovery read-only after a successful public response", async () => {
    mockAuthed = false;
    mockUserId = "";
    render(<VideoDetailRoute />);
    await screen.findByText(video.title);
    expect(screen.queryByLabelText("Write a video comment")).toBeNull();
    expect(screen.queryByText("Report Video")).toBeNull();
    expect(screen.queryByLabelText("Upload thumbnail for this video")).toBeNull();
    expect(screen.getByText("Sign in to join the discussion.")).toBeTruthy();
  });

  it("uses exactly one shared back action with a videos fallback", async () => {
    render(<VideoDetailRoute />);

    await waitFor(() => expect(screen.getByText("Living soil walkthrough")).toBeTruthy());
    expect(screen.getAllByLabelText("Shared back /videos")).toHaveLength(1);
    expect(screen.queryByLabelText("Back to videos")).toBeNull();
    expect(mockAppPageProps).toEqual(
      expect.objectContaining({ backFallbackHref: "/videos" })
    );
  });

  it("lets a signed-in non-owner open an exact video report", async () => {
    render(<VideoDetailRoute />);

    await waitFor(() => expect(screen.getByText("Report Video")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Report Living soil walkthrough"));

    await waitFor(() =>
      expect(mockReportProps).toEqual(
        expect.objectContaining({
          visible: true,
          contentType: "video",
          contentId: "video-1",
          contentTitle: "Living soil walkthrough",
          targetUrl: "/videos/video-1"
        })
      )
    );
    expect(mockLessonMediaCardProps).toEqual(
      expect.objectContaining({
        context: "video",
        lesson: expect.objectContaining({
          title: "Living soil walkthrough",
          videoAssetId: "video-1",
          playbackUrl: undefined
        })
      })
    );
  });

  it("opens the canonical creator profile from the video owner", async () => {
    render(<VideoDetailRoute />);

    await waitFor(() => expect(screen.getByText("Living Soil Labs")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Open Living Soil Labs profile"));

    expect(mockPush).toHaveBeenCalledWith("/creators/owner-1");
  });

  it("does not offer an owner a report action on their own video", async () => {
    mockUserId = "owner-1";
    render(<VideoDetailRoute />);

    await waitFor(() => expect(screen.getByText("Living soil walkthrough")).toBeTruthy());
    expect(screen.queryByText("Report Video")).toBeNull();
  });

  it("passes a protected playback URL into the lesson media card when available", async () => {
    mockGetVideo.mockResolvedValue({
      ...video,
      playbackUrl: "https://r2.example/signed-playback"
    });

    render(<VideoDetailRoute />);

    await waitFor(() => expect(mockLessonMediaCardProps).toBeTruthy());
    expect(mockLessonMediaCardProps).toEqual(
      expect.objectContaining({
        context: "video",
        lesson: expect.objectContaining({
          title: "Living soil walkthrough",
          videoAssetId: "video-1",
          playbackUrl: "https://r2.example/signed-playback"
        })
      })
    );
  });

  it("lets the owner replace the thumbnail used by the existing social share action", async () => {
    mockUserId = "owner-1";
    render(<VideoDetailRoute />);

    await waitFor(() =>
      expect(screen.getByLabelText("Upload thumbnail for this video")).toBeTruthy()
    );
    expect(mockPublicShareProps).toEqual(
      expect.objectContaining({
        path: "/videos/video-1",
        socialPreviewUrl:
          "https://api.growpathai.com/api/videos/64b7f0a1c2d3e4f567890123/share?v=abc"
      })
    );

    fireEvent.press(screen.getByLabelText("Upload thumbnail for this video"));

    await waitFor(() =>
      expect(mockPersistImageUri).toHaveBeenCalledWith("file:///selected-thumbnail.jpg")
    );
    expect(mockUpdateVideo).toHaveBeenCalledWith("video-1", {
      thumbnailUrl: "/uploads/video-thumbnails/selected.jpg"
    });
    await waitFor(() =>
      expect(
        screen.getByText("Thumbnail saved. New social shares will use this image.")
      ).toBeTruthy()
    );
  });
});
