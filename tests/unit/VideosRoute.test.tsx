import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

const mockListVideoLibrary = jest.fn();
const mockSearchVideos = jest.fn();
const mockSetParams = jest.fn();
let mockMode = "personal";
let mockFacilityId: string | null = null;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ tab: "library" }),
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    setParams: mockSetParams
  })
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Videos: "videos" }
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    isAuthed: true,
    user: { id: "user-1", email: "member@example.com" }
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    mode: mockMode,
    plan: mockMode === "facility" ? "facility" : "free",
    facilityId: mockFacilityId,
    can: () => true
  })
}));

jest.mock("@/api/videos", () => ({
  abortVideoUpload: jest.fn(),
  createVideo: jest.fn(),
  deleteVideo: jest.fn(),
  updateVideo: jest.fn(),
  searchVideos: (...args: any[]) => mockSearchVideos(...args),
  listVideoLibrary: (...args: any[]) => mockListVideoLibrary(...args),
  uploadVideoFile: jest.fn()
}));

jest.mock("@/components/layout/AppPage", () => ({
  __esModule: true,
  default: ({ header, children }: any) => {
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
  default: ({ children }: any) => {
    const MockView = require("react-native").View;
    return <MockView>{children}</MockView>;
  }
}));
jest.mock("@/components/InlineError", () => ({
  InlineError: () => null
}));
jest.mock("@/components/learning/LessonMediaSourceEditor", () => ({
  __esModule: true,
  default: () => {
    const MockText = require("react-native").Text;
    return <MockText>Video source editor</MockText>;
  }
}));
jest.mock("@/components/videos/VideoCard", () => ({
  __esModule: true,
  default: ({ video }: any) => {
    const MockText = require("react-native").Text;
    return <MockText>{video.title}</MockText>;
  }
}));

import VideosRoute from "@/app/videos";

describe("universal Videos route", () => {
  beforeEach(() => {
    mockMode = "personal";
    mockFacilityId = null;
    mockListVideoLibrary.mockReset();
    mockSearchVideos.mockReset();
  });

  it("gives a Free personal account its library and truthful storage", async () => {
    mockListVideoLibrary.mockResolvedValue({
      videos: [
        {
          id: "video-1",
          title: "My garden video",
          status: "draft",
          visibility: "public"
        }
      ],
      quota: {
        plan: "free",
        usedBytes: 100 * 1024 * 1024,
        limitBytes: 500 * 1024 * 1024,
        remainingBytes: 400 * 1024 * 1024
      },
      permissions: { canUpload: true, canPublish: true, canManage: true }
    });

    render(<VideosRoute />);

    await waitFor(() => {
      expect(screen.getByText("My garden video")).toBeTruthy();
    });
    expect(screen.getByText("100 MB used of 500 MB")).toBeTruthy();
    expect(screen.getByText("Add a video")).toBeTruthy();
    expect(mockListVideoLibrary).toHaveBeenCalledWith("personal", undefined);
  });

  it("keeps a Facility viewer read-only in the shared library", async () => {
    mockMode = "facility";
    mockFacilityId = "facility-1";
    mockListVideoLibrary.mockResolvedValue({
      videos: [],
      quota: {
        plan: "facility",
        usedBytes: 0,
        limitBytes: 100 * 1024 * 1024 * 1024,
        remainingBytes: 100 * 1024 * 1024 * 1024
      },
      permissions: { canUpload: false, canPublish: false, canManage: false }
    });

    render(<VideosRoute />);

    await waitFor(() => {
      expect(
        screen.getByText(/Your Facility role can watch and follow videos/)
      ).toBeTruthy();
    });
    expect(screen.queryByText("Add a video")).toBeNull();
    expect(mockListVideoLibrary).toHaveBeenCalledWith("facility", "facility-1");
  });
});
