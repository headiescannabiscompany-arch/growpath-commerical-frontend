import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Alert, Linking, Platform } from "react-native";

// Mocks
const mockUseAuth = jest.fn();
const mockUseEntitlements = jest.fn();
const mockApiRequest = jest.fn();
const mockListPersonalGrows = jest.fn();
const mockCreatePersonalTask = jest.fn();
const mockRecordCommercialAnalyticsEvent = jest.fn();
let mockReportProps = null;

jest.mock("@/auth/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth()
}));

jest.mock("@/entitlements", () => ({
  __esModule: true,
  CAPABILITY_KEYS: { LIVE_SESSION_MODERATE: "LIVE_SESSION_MODERATE" },
  useEntitlements: () => mockUseEntitlements()
}));

jest.mock("../src/api/apiRequest", () => ({
  __esModule: true,
  apiRequest: (...args) => mockApiRequest(...args)
}));

jest.mock("../src/api/grows", () => ({
  __esModule: true,
  listPersonalGrows: (...args) => mockListPersonalGrows(...args)
}));

jest.mock("../src/api/tasks", () => ({
  __esModule: true,
  createPersonalTask: (...args) => mockCreatePersonalTask(...args)
}));

jest.mock("../src/api/commercialAnalytics", () => ({
  __esModule: true,
  recordCommercialAnalyticsEvent: (...args) => mockRecordCommercialAnalyticsEvent(...args)
}));

jest.mock("../src/components/ReportModal", () => ({
  __esModule: true,
  default: (props) => {
    if (props.visible) mockReportProps = props;
    return null;
  }
}));

jest.mock("../src/components/FollowButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockFollowButton({ userId }) {
    return React.createElement(
      Text,
      { accessibilityLabel: `Follow ${userId}` },
      "Follow"
    );
  };
});

// Avoid rendering the real embed in tests
jest.mock("../src/screens/LiveSessionTwitchEmbed", () => "LiveSessionTwitchEmbed");

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ href, children }) =>
      React.cloneElement(React.Children.only(children), {
        testID: `live-link-${href}`,
        href
      }),
    useLocalSearchParams: () => ({})
  };
});

import LiveSessionScreen, {
  buildLiveShareTargets,
  createStyles
} from "../src/screens/LiveSessionScreen.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function renderWithNav(params = { sessionId: "session-1" }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false }
    }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <LiveSessionScreen route={{ params }} />
      </NavigationContainer>
    </QueryClientProvider>
  );
}

describe("LiveSessionScreen QA", () => {
  it("builds social shares around the GrowPath session rather than the outside stream", () => {
    const targets = buildLiveShareTargets("Plant premiere", "session-1");

    expect(targets.url).toContain("growpathai.com/live-session?sessionId=session-1");
    expect(targets.facebook).toContain(encodeURIComponent(targets.url));
    expect(targets.bluesky).toContain("bsky.app/intent/compose");
    expect(targets.reddit).toContain("reddit.com/submit");
    expect(targets.linkedin).toContain("linkedin.com/sharing/share-offsite");
  });

  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseEntitlements.mockReset();
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ rsvped: false });
    mockListPersonalGrows.mockReset();
    mockCreatePersonalTask.mockReset();
    mockRecordCommercialAnalyticsEvent.mockReset();
    mockRecordCommercialAnalyticsEvent.mockResolvedValue({ recorded: true });
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    mockReportProps = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does not request a synthetic session when the route has no id", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "viewer-1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });

    const { getByTestId, getByText } = renderWithNav({});

    await waitFor(() =>
      expect(getByText("Choose a live session from Lives.")).toBeTruthy()
    );
    expect(getByTestId("live-link-/lives")).toBeTruthy();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("uses the active palette for unavailable and loaded session states", () => {
    const palette = {
      page: "#0E141B",
      hero: "#101823",
      heroText: "#FFFFFF",
      heroMuted: "#E4ECF5",
      surface: "#151D27",
      surfaceMuted: "#1A2330",
      surfaceStrong: "#202B39",
      border: "#283545",
      text: "#F4F7FB",
      textMuted: "#C9D4DF",
      textSoft: "#DEE7F0",
      accent: "#78AAFF",
      accentSoft: "#16263A",
      accentText: "#FFFFFF",
      danger: "#E29B9B",
      info: "#78AAFF",
      link: "#78AAFF"
    };
    const styles = createStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.hero.backgroundColor).toBe(palette.hero);
    expect(styles.card.backgroundColor).toBe(palette.surface);
    expect(styles.errorCard).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.danger
      })
    );
    expect(styles.secondaryBtn.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.cardTitle.color).toBe(palette.text);
  });

  it("renders moderation UI for admin", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "admin" } });
    mockUseEntitlements.mockReturnValue({
      can: (key) => key === "LIVE_SESSION_MODERATE"
    });

    mockApiRequest.mockResolvedValueOnce({
      twitchChannel: "mychannel",
      twitchModerationUrl: "https://twitch.tv/moderator/mychannel",
      title: "Session 1",
      description: "Live soil mix walkthrough.",
      status: "scheduled",
      visibility: "public",
      scheduledStart: "2026-07-17T21:00:00Z",
      storefrontSlug: "living-soil-labs",
      relatedProductId: "product-1",
      relatedCourseId: "course-1",
      linkedForumThreadId: "thread-1",
      linkedFeedCampaignId: "campaign-1",
      ownerType: "commercial",
      replayUrl: "https://www.twitch.tv/videos/123"
    });

    const { getByRole, getByTestId, getByText, queryByText } = renderWithNav({
      sessionId: "abc123"
    });

    await waitFor(() => {
      expect(queryByText(/Open Twitch Moderation/i)).toBeTruthy();
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/lives/abc123", {
      method: "GET"
    });
    expect(getByText(/Watch on Twitch/i)).toBeTruthy();
    expect(getByRole("header", { name: "Live Session" })).toHaveProp("aria-level", 1);
    expect(getByRole("header", { name: "Session 1" })).toHaveProp("aria-level", 2);
    expect(getByText("Live soil mix walkthrough.")).toBeTruthy();
    expect(getByText("scheduled")).toBeTruthy();
    expect(getByText("public")).toBeTruthy();
    expect(getByText("Product product-1")).toBeTruthy();
    expect(getByText("Course course-1")).toBeTruthy();
    expect(getByText("Forum/Q&A thread-1")).toBeTruthy();
    expect(getByText("Feed Campaign campaign-1")).toBeTruthy();
    expect(getByText("Open Product")).toBeTruthy();
    expect(getByText("Open Course")).toBeTruthy();
    expect(getByText("Open Q&A")).toBeTruthy();
    expect(getByText("Open Campaign")).toBeTruthy();
    expect(
      getByTestId("live-link-/home/commercial/feed?campaignId=campaign-1")
    ).toBeTruthy();
    fireEvent.press(getByText("Open Replay"));
    expect(Linking.openURL).toHaveBeenCalledWith("https://www.twitch.tv/videos/123");
  });

  it("labels an unpublished session as a private draft and withholds sharing", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "host-1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest.mockResolvedValueOnce({
      _id: "draft-1",
      title: "Private hosted-live check",
      status: "draft",
      visibility: "public",
      isPublished: false
    });

    const { getByText, queryByText } = renderWithNav({ sessionId: "draft-1" });

    await waitFor(() => expect(getByText("private draft")).toBeTruthy());
    expect(queryByText("public")).toBeNull();
    expect(queryByText("Share this stream")).toBeNull();
  });

  it("shows an attached premiere video without claiming its destination is missing", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "host-1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest.mockResolvedValueOnce({
      _id: "premiere-1",
      owner: { id: "host-1" },
      title: "Garden premiere",
      sessionType: "premiere",
      sourceVideoId: "video-1",
      status: "draft",
      visibility: "private",
      isPublished: false,
      chatEnabled: true
    });

    const { getByTestId, getByText, queryByText } = renderWithNav({
      sessionId: "premiere-1"
    });

    await waitFor(() => expect(getByText("GrowPath video premiere")).toBeTruthy());
    expect(getByTestId("live-link-/videos/video-1")).toBeTruthy();
    expect(queryByText("No video destination is attached to this live yet.")).toBeNull();
  });

  it("creates a personal task at the configured live-stream date", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "user1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest.mockResolvedValueOnce({
      _id: "live-1",
      title: "Fruit tree pruning clinic",
      description: "Bring your pruning questions.",
      scheduledStart: "2026-08-02T18:00:00Z"
    });
    mockListPersonalGrows.mockResolvedValueOnce([
      { _id: "grow-fruit", status: "active" }
    ]);
    mockCreatePersonalTask.mockResolvedValueOnce({ _id: "task-live" });

    const { getByText } = renderWithNav({ sessionId: "live-1" });
    await waitFor(() => expect(getByText("Add live reminder to My Tasks")).toBeTruthy());
    fireEvent.press(getByText("Add live reminder to My Tasks"));

    await waitFor(() => {
      expect(mockCreatePersonalTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-fruit",
          linkedLiveId: "live-1",
          dueDate: "2026-08-02T18:00:00Z",
          sourceType: "live_reminder",
          reminderPlan: { label: "1 hour before", channels: ["in_app"] }
        })
      );
      expect(getByText("Reminder task created")).toBeTruthy();
    });
  });

  it("persists an RSVP and exposes the reminder-backed going state", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "user1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest
      .mockResolvedValueOnce({
        _id: "live-rsvp",
        title: "Living Soil Q&A",
        scheduledStart: "2026-08-02T18:00:00Z"
      })
      .mockResolvedValueOnce({ rsvped: false })
      .mockResolvedValueOnce({ rsvped: true, rsvpCount: 1 });

    const { getByText } = renderWithNav({ sessionId: "live-rsvp" });
    await waitFor(() => expect(getByText("RSVP / Remind Me")).toBeTruthy());
    fireEvent.press(getByText("RSVP / Remind Me"));

    await waitFor(() => expect(getByText("Going · Cancel RSVP")).toBeTruthy());
    expect(mockApiRequest).toHaveBeenCalledWith("/api/lives/live-rsvp/rsvp", {
      method: "POST",
      body: {}
    });
  });

  it("keeps public campaign links on the public feed placement route", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "user1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });

    mockApiRequest.mockResolvedValueOnce({
      twitchChannel: "mychannel",
      title: "Public Session",
      linkedFeedCampaignId: "campaign-public"
    });

    const { getByTestId, queryByText } = renderWithNav();

    await waitFor(() => {
      expect(queryByText(/Public Session/i)).toBeTruthy();
    });

    expect(getByTestId("live-link-/feed?campaignId=campaign-public")).toBeTruthy();
  });

  it("hides moderation UI for non-admin", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "user1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });

    mockApiRequest.mockResolvedValueOnce({
      twitchChannel: "mychannel",
      title: "Session 1"
    });

    const { queryByText } = renderWithNav();

    await waitFor(() => {
      expect(queryByText(/Open Twitch Moderation/i)).toBeNull();
    });
  });

  it("hides moderation UI when no moderation URL is available", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "admin" } });
    mockUseEntitlements.mockReturnValue({
      can: (key) => key === "LIVE_SESSION_MODERATE"
    });

    mockApiRequest.mockResolvedValueOnce({
      twitchChannel: "mychannel",
      title: "Session 1"
    });

    const { queryByText } = renderWithNav();

    await waitFor(() => {
      expect(queryByText(/Session 1/i)).toBeTruthy();
      expect(queryByText(/Open Twitch Moderation/i)).toBeNull();
    });
  });

  it("lets a hosted-live owner rotate and save replacement OBS credentials", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "host-1" }, isAuthed: true });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest.mockImplementation((url, options = {}) => {
      if (url === "/api/lives/hosted-1" && options.method === "GET") {
        return Promise.resolve({
          _id: "hosted-1",
          owner: { id: "host-1" },
          title: "Garden walk",
          broadcastMode: "growpath",
          chatEnabled: false
        });
      }
      if (url === "/api/lives/hosted-1/rsvp") {
        return Promise.resolve({ rsvped: false });
      }
      if (url === "/api/lives/hosted-1/hosted-status") {
        return Promise.resolve({ lifecycle: "ready" });
      }
      if (url === "/api/lives/hosted-1/hosted-input/rotate") {
        return Promise.resolve({
          credentials: {
            rtmpsUrl: "rtmps://live.example.test/input",
            streamKey: "replacement-secret"
          },
          shownOnce: true
        });
      }
      return Promise.resolve({});
    });
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText } = renderWithNav({ sessionId: "hosted-1" });
    await waitFor(() => expect(getByText("Rotate OBS Stream Key")).toBeTruthy());
    fireEvent.press(getByText("Rotate OBS Stream Key"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Rotate OBS stream key?",
      expect.stringContaining("stop working immediately"),
      expect.any(Array)
    );
    const actions = alertSpy.mock.calls.at(-1)[2];
    await act(async () => {
      await actions.find((action) => action.text === "Rotate key").onPress();
    });

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/lives/hosted-1/hosted-input/rotate",
        { method: "POST", body: {} }
      );
      expect(getByText("rtmps://live.example.test/input")).toBeTruthy();
      expect(getByText("replacement-secret")).toBeTruthy();
      expect(getByText("Copy replacement key")).toBeTruthy();
    });
  });

  it("uses a working browser confirmation before rotating hosted OBS credentials", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "host-1" }, isAuthed: true });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest.mockImplementation((url, options = {}) => {
      if (url === "/api/lives/hosted-1" && options.method === "GET") {
        return Promise.resolve({
          _id: "hosted-1",
          owner: { id: "host-1" },
          title: "Garden walk",
          broadcastMode: "growpath",
          chatEnabled: false
        });
      }
      if (url === "/api/lives/hosted-1/rsvp") {
        return Promise.resolve({ rsvped: false });
      }
      if (url === "/api/lives/hosted-1/hosted-status") {
        return Promise.resolve({ lifecycle: "ready" });
      }
      if (url === "/api/lives/hosted-1/hosted-input/rotate") {
        return Promise.resolve({
          credentials: {
            rtmpsUrl: "rtmps://live.example.test/input",
            streamKey: "replacement-secret"
          },
          shownOnce: true
        });
      }
      return Promise.resolve({});
    });

    const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, "OS");
    const originalConfirm = globalThis.confirm;
    const confirmSpy = jest.fn(() => true);
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    globalThis.confirm = confirmSpy;

    try {
      const { getByText } = renderWithNav({ sessionId: "hosted-1" });
      await waitFor(() => expect(getByText("Rotate OBS Stream Key")).toBeTruthy());
      fireEvent.press(getByText("Rotate OBS Stream Key"));

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("current key will stop working immediately")
      );
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          "/api/lives/hosted-1/hosted-input/rotate",
          { method: "POST", body: {} }
        );
        expect(getByText("Copy replacement key")).toBeTruthy();
      });
    } finally {
      if (platformDescriptor) Object.defineProperty(Platform, "OS", platformDescriptor);
      else delete Platform.OS;
      globalThis.confirm = originalConfirm;
    }
  });

  it("ends a hosted broadcast through the atomic endpoint without unbinding first", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "host-1" }, isAuthed: true });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest.mockImplementation((url, options = {}) => {
      if (url === "/api/lives/hosted-end" && options.method === "GET") {
        return Promise.resolve({
          _id: "hosted-end",
          owner: { id: "host-1", displayName: "Host" },
          title: "Live garden walk",
          status: "live",
          isPublished: true,
          broadcastMode: "growpath",
          chatEnabled: false
        });
      }
      if (url === "/api/lives/hosted-end/rsvp") {
        return Promise.resolve({ rsvped: false });
      }
      if (url === "/api/lives/hosted-end/hosted-status") {
        return Promise.resolve({ lifecycle: "connected" });
      }
      if (url === "/api/lives/hosted-end/playback") return Promise.resolve({});
      if (url === "/api/lives/hosted-end/end" && options.method === "POST") {
        return Promise.resolve({
          ended: true,
          session: {
            _id: "hosted-end",
            owner: { id: "host-1", displayName: "Host" },
            title: "Live garden walk",
            status: "ended",
            isPublished: true,
            broadcastMode: "growpath",
            chatEnabled: false
          }
        });
      }
      return Promise.resolve({});
    });

    const { getByText } = renderWithNav({ sessionId: "hosted-end" });
    fireEvent.press(await waitFor(() => getByText("End broadcast")));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/lives/hosted-end/end", {
        method: "POST",
        body: {}
      })
    );
    expect(
      mockApiRequest.mock.calls.some(
        ([url, options]) =>
          url === "/api/lives/hosted-end/hosted-input" || options?.method === "DELETE"
      )
    ).toBe(false);
    expect(getByText("ended")).toBeTruthy();
  });

  it("keeps provider-stop recovery visible until the hosted input is confirmed stopped", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "host-1" }, isAuthed: true });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    let endAttempts = 0;
    mockApiRequest.mockImplementation((url, options = {}) => {
      if (url === "/api/lives/hosted-retry" && options.method === "GET") {
        return Promise.resolve({
          _id: "hosted-retry",
          owner: { id: "host-1", displayName: "Host" },
          title: "Provider retry check",
          status: "live",
          isPublished: true,
          broadcastMode: "growpath",
          chatEnabled: false
        });
      }
      if (url === "/api/lives/hosted-retry/rsvp") {
        return Promise.resolve({ rsvped: false });
      }
      if (url === "/api/lives/hosted-retry/hosted-status") {
        return Promise.resolve({
          lifecycle: endAttempts ? "degraded" : "connected",
          providerStopPending: endAttempts === 1
        });
      }
      if (url === "/api/lives/hosted-retry/playback") return Promise.resolve({});
      if (url === "/api/lives/hosted-retry/end" && options.method === "POST") {
        endAttempts += 1;
        return Promise.resolve({
          session: {
            _id: "hosted-retry",
            owner: { id: "host-1", displayName: "Host" },
            title: "Provider retry check",
            status: "ended",
            isPublished: true,
            broadcastMode: "growpath",
            chatEnabled: false
          },
          providerStopPending: endAttempts === 1
        });
      }
      return Promise.resolve({});
    });

    const { getByText, queryByText } = renderWithNav({
      sessionId: "hosted-retry"
    });
    fireEvent.press(await waitFor(() => getByText("End broadcast")));

    await waitFor(() => expect(getByText("Retry provider stop")).toBeTruthy());
    expect(getByText("Video provider stop pending")).toBeTruthy();
    fireEvent.press(getByText("Retry provider stop"));

    await waitFor(() => expect(endAttempts).toBe(2));
    await waitFor(() => expect(queryByText("Video provider stop pending")).toBeNull());
  });

  it("lets the host explicitly start and end a scheduled outside-provider session", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "host-1" }, isAuthed: true });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest.mockImplementation((url, options = {}) => {
      if (url === "/api/lives/external-scheduled" && options.method === "GET") {
        return Promise.resolve({
          _id: "external-scheduled",
          owner: { id: "host-1", displayName: "Host" },
          title: "YouTube garden clinic",
          status: "scheduled",
          isPublished: true,
          broadcastMode: "external",
          streamPlatform: "youtube",
          externalWatchUrl: "https://youtube.example/live",
          chatEnabled: false
        });
      }
      if (url === "/api/lives/external-scheduled/rsvp") {
        return Promise.resolve({ rsvped: false });
      }
      if (url === "/api/lives/external-scheduled/start" && options.method === "POST") {
        return Promise.resolve({
          session: {
            _id: "external-scheduled",
            owner: { id: "host-1", displayName: "Host" },
            title: "YouTube garden clinic",
            status: "live",
            isPublished: true,
            broadcastMode: "external",
            streamPlatform: "youtube",
            externalWatchUrl: "https://youtube.example/live",
            chatEnabled: false
          }
        });
      }
      return Promise.resolve({});
    });

    const { getByText } = renderWithNav({ sessionId: "external-scheduled" });
    fireEvent.press(await waitFor(() => getByText("Start live session")));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/lives/external-scheduled/start", {
        method: "POST",
        body: {}
      })
    );
    expect(getByText("live")).toBeTruthy();
    expect(getByText("End broadcast")).toBeTruthy();
  });

  it("does not offer a manual start action for scheduled Twitch sessions", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "host-1" }, isAuthed: true });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest.mockImplementation((url, options = {}) => {
      if (url === "/api/lives/twitch-scheduled" && options.method === "GET") {
        return Promise.resolve({
          _id: "twitch-scheduled",
          owner: { id: "host-1", displayName: "Host" },
          title: "Scheduled Twitch clinic",
          status: "scheduled",
          isPublished: true,
          broadcastMode: "external",
          streamPlatform: "twitch",
          twitchChannel: "growpath",
          chatEnabled: false
        });
      }
      if (url === "/api/lives/twitch-scheduled/rsvp") {
        return Promise.resolve({ rsvped: false });
      }
      return Promise.resolve({});
    });

    const { getByText, queryByText } = renderWithNav({
      sessionId: "twitch-scheduled"
    });

    await waitFor(() => expect(getByText("End scheduled session")).toBeTruthy());
    expect(queryByText("Start live session")).toBeNull();
  });

  it("serializes start and end actions so their responses cannot race", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "host-1" }, isAuthed: true });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    let resolveStart;
    let endCalls = 0;
    const startPromise = new Promise((resolve) => {
      resolveStart = resolve;
    });
    mockApiRequest.mockImplementation((url, options = {}) => {
      if (url === "/api/lives/external-race" && options.method === "GET") {
        return Promise.resolve({
          _id: "external-race",
          owner: { id: "host-1", displayName: "Host" },
          title: "Outside stream race check",
          status: "scheduled",
          isPublished: true,
          broadcastMode: "external",
          streamPlatform: "youtube",
          chatEnabled: false
        });
      }
      if (url === "/api/lives/external-race/rsvp") {
        return Promise.resolve({ rsvped: false });
      }
      if (url === "/api/lives/external-race/start" && options.method === "POST") {
        return startPromise;
      }
      if (url === "/api/lives/external-race/end" && options.method === "POST") {
        endCalls += 1;
        return Promise.resolve({ session: { status: "ended" } });
      }
      return Promise.resolve({});
    });

    const { getByText } = renderWithNav({ sessionId: "external-race" });
    fireEvent.press(await waitFor(() => getByText("Start live session")));
    fireEvent.press(getByText("End scheduled session"));

    expect(endCalls).toBe(0);
    await act(async () => {
      resolveStart({
        session: {
          _id: "external-race",
          owner: { id: "host-1", displayName: "Host" },
          title: "Outside stream race check",
          status: "live",
          isPublished: true,
          broadcastMode: "external",
          streamPlatform: "youtube",
          chatEnabled: false
        }
      });
    });
    await waitFor(() => expect(getByText("live")).toBeTruthy());
  });

  it("ignores a hosted-status poll that began before provider-stop recovery", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "host-1" }, isAuthed: true });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    let resolveHostedStatus;
    let hostedStatusRequested = false;
    const hostedStatusPromise = new Promise((resolve) => {
      resolveHostedStatus = resolve;
    });
    mockApiRequest.mockImplementation((url, options = {}) => {
      if (url === "/api/lives/hosted-stale" && options.method === "GET") {
        return Promise.resolve({
          _id: "hosted-stale",
          owner: { id: "host-1", displayName: "Host" },
          title: "Stale poll check",
          status: "live",
          isPublished: true,
          broadcastMode: "growpath",
          chatEnabled: false
        });
      }
      if (url === "/api/lives/hosted-stale/rsvp") {
        return Promise.resolve({ rsvped: false });
      }
      if (url === "/api/lives/hosted-stale/hosted-status") {
        hostedStatusRequested = true;
        return hostedStatusPromise;
      }
      if (url === "/api/lives/hosted-stale/end" && options.method === "POST") {
        return Promise.resolve({
          session: {
            _id: "hosted-stale",
            owner: { id: "host-1", displayName: "Host" },
            title: "Stale poll check",
            status: "ended",
            isPublished: true,
            broadcastMode: "growpath",
            chatEnabled: false
          },
          providerStopPending: true
        });
      }
      return Promise.resolve({});
    });

    const { getByText } = renderWithNav({ sessionId: "hosted-stale" });
    await waitFor(() => expect(hostedStatusRequested).toBe(true));
    fireEvent.press(getByText("End broadcast"));
    await waitFor(() => expect(getByText("Retry provider stop")).toBeTruthy());

    await act(async () => {
      resolveHostedStatus({
        lifecycle: "connected",
        sessionStatus: "live",
        providerStopPending: false
      });
    });

    expect(getByText("Retry provider stop")).toBeTruthy();
  });

  it("uses hosted polling to refresh the canonical session status", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "host-1" }, isAuthed: true });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest.mockImplementation((url, options = {}) => {
      if (url === "/api/lives/hosted-promoted" && options.method === "GET") {
        return Promise.resolve({
          _id: "hosted-promoted",
          owner: { id: "host-1", displayName: "Host" },
          title: "Hosted status promotion",
          status: "scheduled",
          isPublished: true,
          broadcastMode: "growpath",
          chatEnabled: false
        });
      }
      if (url === "/api/lives/hosted-promoted/rsvp") {
        return Promise.resolve({ rsvped: false });
      }
      if (url === "/api/lives/hosted-promoted/hosted-status") {
        return Promise.resolve({
          lifecycle: "connected",
          sessionStatus: "live",
          providerStopPending: false
        });
      }
      if (url === "/api/lives/hosted-promoted/playback") return Promise.resolve({});
      return Promise.resolve({});
    });

    const { getByText, queryByText } = renderWithNav({
      sessionId: "hosted-promoted"
    });

    await waitFor(() => expect(getByText("live")).toBeTruthy());
    expect(queryByText("scheduled")).toBeNull();
    expect(getByText("End broadcast")).toBeTruthy();
  });

  it("shows the public creator identity and follow control", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "viewer-1" }, isAuthed: true });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest.mockResolvedValueOnce({
      _id: "creator-live",
      owner: {
        id: "creator-1",
        displayName: "Living Soil Labs",
        avatarUrl: "https://example.com/avatar.jpg"
      },
      title: "Soil clinic",
      status: "scheduled",
      isPublished: true
    });

    const { getByLabelText, getByText } = renderWithNav({ sessionId: "creator-live" });

    await waitFor(() => expect(getByText("Hosted by Living Soil Labs")).toBeTruthy());
    expect(getByLabelText("Follow creator-1")).toBeTruthy();
  });

  it("lets a signed-in non-owner open an exact live-session report", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "viewer-1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest.mockResolvedValueOnce({
      _id: "live-report-1",
      ownerId: "owner-1",
      title: "Live soil questions"
    });

    const { getByLabelText } = renderWithNav({
      sessionId: "live-report-1"
    });

    await waitFor(() =>
      expect(getByLabelText("Report Live soil questions")).toBeTruthy()
    );
    fireEvent.press(getByLabelText("Report Live soil questions"));

    await waitFor(() =>
      expect(mockReportProps).toEqual(
        expect.objectContaining({
          visible: true,
          contentType: "liveSession",
          contentId: "live-report-1",
          contentTitle: "Live soil questions",
          targetUrl: "/live-session?sessionId=live-report-1"
        })
      )
    );
  });

  it("uses public Store search fallback for product links without a storefront slug", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "user1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });

    mockApiRequest.mockResolvedValueOnce({
      twitchChannel: "mychannel",
      title: "Session 1",
      relatedProductId: "product-1"
    });

    const { getByTestId, queryByText } = renderWithNav();

    await waitFor(() => {
      expect(queryByText(/Session 1/i)).toBeTruthy();
    });

    expect(getByTestId("live-link-/store?q=product-1")).toBeTruthy();
  });

  it("routes live product and course CTAs through storefront slug aliases", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "user1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });

    mockApiRequest.mockResolvedValueOnce({
      twitchChannel: "mychannel",
      title: "Session 1",
      linkedStorefrontSlug: "living-soil-labs",
      relatedProductId: "product-1",
      relatedCourseId: "course-1"
    });

    const { getByTestId, queryByText } = renderWithNav();

    await waitFor(() => {
      expect(queryByText(/Session 1/i)).toBeTruthy();
    });

    expect(
      getByTestId("live-link-/store/living-soil-labs/products/product-1")
    ).toBeTruthy();
    expect(
      getByTestId("live-link-/store/living-soil-labs/courses/course-1")
    ).toBeTruthy();
  });

  it("shows error if session not found", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "user1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });

    mockApiRequest.mockRejectedValueOnce(new Error("No session found"));

    const { getByRole, queryByText } = renderWithNav();

    await waitFor(() => {
      expect(queryByText("This live session is unavailable.")).toBeTruthy();
    });
    expect(getByRole("header", { name: "Live session unavailable" })).toHaveProp(
      "aria-level",
      2
    );
  });

  it("does not expose backend cast errors", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "user1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });
    mockApiRequest.mockRejectedValueOnce(
      new Error('Cast to ObjectId failed for value "session-1" at path "_id"')
    );

    const { queryByText } = renderWithNav({ sessionId: "bad-id" });

    await waitFor(() =>
      expect(queryByText("This live session is unavailable.")).toBeTruthy()
    );
    expect(queryByText(/Cast to ObjectId/i)).toBeNull();
  });
});
