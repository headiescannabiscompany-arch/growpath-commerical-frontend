import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import VideoDetailRoute from "@/app/videos/[videoId]";

const mockGetVideo = jest.fn();
const mockListVideoComments = jest.fn();
let mockReportProps: any = null;
let mockLessonMediaCardProps: any = null;
let mockAppPageProps: any = null;
let mockUserId = "viewer-1";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ videoId: "video-1" })
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
  createVideoComment: jest.fn(),
  deleteVideoComment: jest.fn()
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
  cannabisSpecific: false
};

describe("VideoDetailRoute reporting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReportProps = null;
    mockLessonMediaCardProps = null;
    mockAppPageProps = null;
    mockUserId = "viewer-1";
    mockGetVideo.mockResolvedValue(video);
    mockListVideoComments.mockResolvedValue([]);
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
});
