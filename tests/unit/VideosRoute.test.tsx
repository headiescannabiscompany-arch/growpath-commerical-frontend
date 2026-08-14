import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockListVideoLibrary = jest.fn();
const mockSearchVideos = jest.fn();
const mockDeleteVideo = jest.fn();
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
  deleteVideo: (...args: any[]) => mockDeleteVideo(...args),
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
  default: ({ video, onDelete }: any) => {
    const {
      Pressable: MockPressable,
      Text: MockText,
      View: MockView
    } = require("react-native");
    return (
      <MockView>
        <MockText>{video.title}</MockText>
        {onDelete ? (
          <MockPressable
            accessibilityLabel={`Remove ${video.title}`}
            onPress={() => onDelete(video)}
          >
            <MockText>Remove</MockText>
          </MockPressable>
        ) : null}
      </MockView>
    );
  }
}));

import VideosRoute, { createVideosRouteStyles } from "@/app/videos";
import { getThemePalette } from "@/theme/appTheme";

jest.setTimeout(15000);

describe("universal Videos route", () => {
  beforeEach(() => {
    mockMode = "personal";
    mockFacilityId = null;
    mockListVideoLibrary.mockReset();
    mockSearchVideos.mockReset();
    mockDeleteVideo.mockReset();
    mockDeleteVideo.mockResolvedValue({ deleted: true });
  });

  it("uses the active Night palette for the shared library and writer surfaces", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createVideosRouteStyles(palette);

    expect(styles.pageTitle.color).toBe(palette.text);
    expect(styles.libraryMetric.backgroundColor).toBe(palette.card);
    expect(styles.libraryMetricValue.color).toBe(palette.text);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.choice.borderColor).toBe(palette.border);
    expect(styles.primaryButton.backgroundColor).toBe(palette.accent);
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
    expect(screen.getByText("Video grow interests")).toBeTruthy();
    expect(screen.queryByLabelText("Toggle grow interest Cannabis")).toBeNull();
    fireEvent.press(screen.getByLabelText("Toggle Video grow interests"));
    expect(screen.getByLabelText("Toggle grow interest Cannabis")).toBeTruthy();
    expect(mockListVideoLibrary).toHaveBeenCalledWith("personal", undefined);
  });

  it("does not send a Facility ID when the user switches to Commercial", async () => {
    mockMode = "commercial";
    mockFacilityId = "facility-1";
    mockListVideoLibrary.mockResolvedValue({
      videos: [],
      quota: {
        plan: "commercial",
        usedBytes: 0,
        limitBytes: 100 * 1024 * 1024 * 1024,
        remainingBytes: 100 * 1024 * 1024 * 1024
      },
      permissions: { canUpload: true, canPublish: true, canManage: true }
    });

    render(<VideosRoute />);

    await waitFor(() => {
      expect(screen.getByText("Commercial video storage")).toBeTruthy();
    });
    expect(mockListVideoLibrary).toHaveBeenCalledWith("commercial", undefined);
  });

  it("lets the library switch between the full workspace and the user's uploads", async () => {
    mockListVideoLibrary.mockResolvedValue({
      videos: [
        {
          id: "mine-1",
          uploaderUserId: "user-1",
          title: "My garden video",
          status: "draft",
          visibility: "public"
        },
        {
          id: "team-1",
          uploaderUserId: "user-2",
          title: "Team update",
          status: "published",
          visibility: "followers"
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
    expect(screen.getByText("Team update")).toBeTruthy();

    fireEvent.press(screen.getByText("My uploads"));

    await waitFor(() => {
      expect(screen.getByText("My garden video")).toBeTruthy();
      expect(screen.queryByText("Team update")).toBeNull();
    });
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

  it("lets Facility staff remove their own unpublished draft", async () => {
    mockMode = "facility";
    mockFacilityId = "facility-1";
    mockListVideoLibrary.mockResolvedValue({
      videos: [
        {
          id: "staff-draft",
          uploaderUserId: "user-1",
          title: "Staff training draft",
          status: "draft",
          visibility: "facility_internal"
        }
      ],
      quota: {
        plan: "facility",
        usedBytes: 0,
        limitBytes: 100 * 1024 * 1024 * 1024,
        remainingBytes: 100 * 1024 * 1024 * 1024
      },
      permissions: { canUpload: true, canPublish: false, canManage: false }
    });

    render(<VideosRoute />);

    await waitFor(() => {
      expect(screen.getByText("Staff training draft")).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText("Remove Staff training draft"));
    await waitFor(() => {
      expect(
        screen.getByLabelText("Confirm removal of Staff training draft")
      ).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText("Confirm removal of Staff training draft"));
    await waitFor(() => {
      expect(mockDeleteVideo).toHaveBeenCalledWith(
        "staff-draft",
        "facility",
        "facility-1"
      );
    });
  });
});
