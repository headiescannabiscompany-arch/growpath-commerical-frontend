import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Linking } from "react-native";

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

import LiveSessionScreen, { createStyles } from "../src/screens/LiveSessionScreen.js";
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
