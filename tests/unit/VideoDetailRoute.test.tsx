import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

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
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ videoId: "video-1" }),
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    isAuthed: true,
    user: { id: mockUserId, _id: mockUserId }
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
