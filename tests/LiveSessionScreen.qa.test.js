import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Linking } from "react-native";

// Mocks
const mockUseAuth = jest.fn();
const mockUseEntitlements = jest.fn();
const mockApiRequest = jest.fn();

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

import LiveSessionScreen from "../src/screens/LiveSessionScreen.js";
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
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      replayUrl: "https://www.twitch.tv/videos/123"
    });

    const { getByTestId, getByText, queryByText } = renderWithNav({
      sessionId: "abc123"
    });

    await waitFor(() => {
      expect(queryByText(/Open Twitch Moderation/i)).toBeTruthy();
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/lives/abc123", {
      method: "GET"
    });
    expect(getByText(/Watch on Twitch/i)).toBeTruthy();
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
    expect(getByTestId("live-link-/feed?campaignId=campaign-1")).toBeTruthy();
    fireEvent.press(getByText("Open Replay"));
    expect(Linking.openURL).toHaveBeenCalledWith("https://www.twitch.tv/videos/123");
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

  it("shows error if session not found", async () => {
    mockUseAuth.mockReturnValue({ user: { _id: "user1" } });
    mockUseEntitlements.mockReturnValue({ can: () => false });

    mockApiRequest.mockRejectedValueOnce(new Error("No session found"));

    const { queryByText } = renderWithNav();

    await waitFor(() => {
      expect(queryByText(/No session found/i)).toBeTruthy();
    });
  });
});
