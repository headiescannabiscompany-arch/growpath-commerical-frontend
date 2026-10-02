import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockListVideoLibrary = jest.fn();
const mockSearchVideos = jest.fn();
const mockDeleteVideo = jest.fn();
const mockSetParams = jest.fn();
let mockMode = "personal";
let mockFacilityId: string | null = null;
let mockUserId = "user-1";
let mockReady = true;
let mockHydrating = false;
let mockBootstrapError: any = null;
let mockTab = "library";
const mockRetryMe = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ tab: mockTab }),
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
    isHydrating: mockHydrating,
    retryMe: mockRetryMe,
    user: { id: mockUserId, email: "member@example.com" }
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    mode: mockMode,
    plan: mockMode === "facility" ? "facility" : "free",
    facilityId: mockFacilityId,
    ready: mockReady,
    bootstrapError: mockBootstrapError,
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
    mockUserId = "user-1";
    mockReady = true;
    mockHydrating = false;
    mockBootstrapError = null;
    mockTab = "library";
    mockRetryMe.mockReset();
    mockListVideoLibrary.mockReset();
    mockSearchVideos.mockReset();
    mockDeleteVideo.mockReset();
    mockDeleteVideo.mockResolvedValue({ deleted: true });
  });

  function libraryResult(title = "Current video") {
    return {
      videos: [{ id: title, title, uploaderUserId: mockUserId, status: "draft" }],
      quota: { usedBytes: 1024, limitBytes: 2048, remainingBytes: 1024 },
      permissions: { canUpload: true, canPublish: true, canManage: true }
    };
  }

  it("does not claim an empty library or expose the writer after a failed read; retry recovers", async () => {
    mockListVideoLibrary.mockRejectedValueOnce(new Error("offline"));
    mockListVideoLibrary.mockResolvedValueOnce(libraryResult());
    render(<VideosRoute />);
    await screen.findByText("Video library unavailable");
    expect(screen.queryByText("This workspace has no videos yet.")).toBeNull();
    expect(screen.queryByText(/0 B used/)).toBeNull();
    expect(screen.queryByText("Add a video")).toBeNull();
    fireEvent.press(screen.getByLabelText("Retry video library"));
    await screen.findByText("Current video");
    expect(screen.getByText("1 KB used of 2 KB")).toBeTruthy();
  });

  it("waits for access readiness without requesting a library or rendering unknown quota", async () => {
    mockHydrating = true;
    mockReady = false;
    mockListVideoLibrary.mockResolvedValue(libraryResult());
    const view = render(<VideosRoute />);
    expect(mockListVideoLibrary).not.toHaveBeenCalled();
    expect(screen.queryByText(/0 B used/)).toBeNull();
    mockHydrating = false;
    mockReady = true;
    view.rerender(<VideosRoute />);
    await screen.findByText("Current video");
  });

  it("offers a single-flight retry for unresolved access instead of a library read", async () => {
    mockReady = false;
    mockBootstrapError = new Error("offline");
    mockRetryMe.mockReturnValue(new Promise(() => {}));
    render(<VideosRoute />);
    fireEvent.press(screen.getByLabelText("Retry video access"));
    fireEvent.press(screen.getByLabelText("Retry video access"));
    expect(mockRetryMe).toHaveBeenCalledTimes(1);
    expect(mockListVideoLibrary).not.toHaveBeenCalled();
  });

  it.each(["account", "facility"])(
    "clears the previous library and unfinished form on %s change",
    async (change) => {
      mockListVideoLibrary.mockResolvedValueOnce(libraryResult("Previous private video"));
      let finish: (value: any) => void = () => {};
      mockListVideoLibrary.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
      const view = render(<VideosRoute />);
      await screen.findByText("Previous private video");
      fireEvent.changeText(
        screen.getByLabelText("Video title"),
        "Unsubmitted private draft"
      );
      if (change === "account") mockUserId = "user-2";
      else {
        mockMode = "facility";
        mockFacilityId = "facility-2";
      }
      view.rerender(<VideosRoute />);
      expect(screen.queryByText("Previous private video")).toBeNull();
      expect(screen.queryByDisplayValue("Unsubmitted private draft")).toBeNull();
      await act(async () => finish(libraryResult("New workspace video")));
      await screen.findByText("New workspace video");
      expect(screen.getByLabelText("Video title").props.value).toBe("");
    }
  );

  it("ignores a late previous-account library response", async () => {
    let finishOld: (value: any) => void = () => {};
    mockListVideoLibrary.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        })
    );
    mockListVideoLibrary.mockResolvedValueOnce(libraryResult("New account video"));
    const view = render(<VideosRoute />);
    mockUserId = "user-2";
    view.rerender(<VideosRoute />);
    await screen.findByText("New account video");
    await act(async () => finishOld(libraryResult("Old account video")));
    expect(screen.queryByText("Old account video")).toBeNull();
  });

  it("does not replace newer discovery results with a late search", async () => {
    mockTab = "discover";
    let finishOld: (value: any) => void = () => {};
    mockSearchVideos.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        })
    );
    mockSearchVideos.mockResolvedValueOnce([{ id: "new", title: "New search result" }]);
    render(<VideosRoute />);
    fireEvent.changeText(screen.getByLabelText("Search videos"), "new");
    await screen.findByText("New search result");
    await act(async () => finishOld([{ id: "old", title: "Old search result" }]));
    expect(screen.queryByText("Old search result")).toBeNull();
    expect(screen.getByText("New search result")).toBeTruthy();
  });

  it("rejects missing storage information instead of displaying plan-default zero usage", async () => {
    mockListVideoLibrary.mockResolvedValue({
      videos: [],
      permissions: { canUpload: true }
    });
    render(<VideosRoute />);
    await screen.findByText("Video library unavailable");
    expect(screen.queryByText(/0 B used/)).toBeNull();
    expect(screen.queryByText("Add a video")).toBeNull();
  });

  it("keeps an unfinished same-workspace draft through a tab change and read retry", async () => {
    mockListVideoLibrary.mockResolvedValueOnce(libraryResult());
    mockListVideoLibrary.mockRejectedValueOnce(new Error("offline"));
    let finishRetry: (value: any) => void = () => {};
    mockListVideoLibrary.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRetry = resolve;
        })
    );
    mockSearchVideos.mockResolvedValue([]);
    render(<VideosRoute />);
    await screen.findByText("Current video");
    fireEvent.changeText(screen.getByLabelText("Video title"), "Keep this draft");
    fireEvent.press(screen.getByText("Discover Videos"));
    await screen.findByText("No accessible videos match this search.");
    fireEvent.press(screen.getByText("My / Workspace Library"));
    await screen.findByText("Video library unavailable");
    const retry = screen.getByLabelText("Retry video library");
    fireEvent.press(retry);
    fireEvent.press(retry);
    expect(mockListVideoLibrary).toHaveBeenCalledTimes(3);
    await act(async () => finishRetry(libraryResult()));
    await screen.findByDisplayValue("Keep this draft");
  });

  it("ignores a late library failure after switching to discovery", async () => {
    let failOld: (value: any) => void = () => {};
    mockListVideoLibrary.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          failOld = reject;
        })
    );
    mockSearchVideos.mockResolvedValue([{ id: "public", title: "Published result" }]);
    render(<VideosRoute />);
    fireEvent.press(screen.getByText("Discover Videos"));
    await screen.findByText("Published result");
    await act(async () => failOld(new Error("late failure")));
    expect(screen.queryByText("Video search unavailable")).toBeNull();
    expect(screen.getByText("Published result")).toBeTruthy();
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
