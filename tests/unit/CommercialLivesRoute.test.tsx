import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";

import CommercialLivesRoute from "@/app/home/commercial/lives";

const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useLocalSearchParams: () => ({ liveId: "live-1" })
  };
});

jest.mock("@/components/InlineError", () => ({
  InlineError: () => null
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, header }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

describe("CommercialLivesRoute", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/commercial/lives" && !options) {
        return Promise.resolve({
          lives: [
            {
              id: "live-1",
              title: "Soil Mix Demo",
              description: "Build a dry amendment recipe live.",
              status: "scheduled",
              visibility: "public",
              scheduledStart: "2026-07-10T20:00:00Z",
              scheduledEnd: "2026-07-10T21:00:00Z",
              reminderPreference: "1 hour before",
              recurrenceRule: "monthly",
              twitchChannelName: "growpath",
              twitchChannelId: "12345",
              twitchEmbedUrl: "https://player.twitch.tv/?channel=growpath",
              eventSubStatus: "connected",
              relatedProductId: "product-1",
              relatedCourseId: "course-1",
              relatedFeedCampaignId: "campaign-1",
              forumThreadId: "thread-1",
              growInterests: ["living soil", "dry amendments"],
              notificationPlan: ["24h_before", "1h_before", "15m_before"],
              replayUrl: "https://twitch.tv/videos/1"
            }
          ]
        });
      }
      if (path === "/api/twitch/status") {
        return Promise.resolve({
          configured: true,
          connection: {
            status: "connected",
            broadcasterId: "12345",
            broadcasterLogin: "growpath",
            broadcasterName: "GrowPath",
            eventSubStatus: "connected"
          }
        });
      }
      if (path === "/api/twitch/connect" && options?.method === "POST") {
        return Promise.resolve({
          configured: true,
          authorizationUrl: "https://id.twitch.tv/oauth2/authorize?state=test"
        });
      }
      if (path === "/api/commercial/lives" && options?.method === "POST") {
        return Promise.resolve({ live: { id: "live-new", ...options.body } });
      }
      if (path === "/api/tasks" && options?.method === "POST") {
        return Promise.resolve({ task: { id: "task-new", ...options.body } });
      }
      return Promise.resolve({});
    });
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("schedules lives with course, product, feed, forum, replay, and reminder links", async () => {
    const screen = render(<CommercialLivesRoute />);

    await waitFor(() => expect(screen.getByText("Lives / Twitch")).toBeTruthy());

    expect(screen.getByText("Shared Schedule")).toBeTruthy();
    expect(screen.getByText("Notifications")).toBeTruthy();
    expect(screen.getByText("GrowPath | EventSub connected")).toBeTruthy();
    expect(screen.getByLabelText("Disconnect Twitch")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Connect Twitch with OAuth"));
    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith(
        "https://id.twitch.tv/oauth2/authorize?state=test"
      )
    );

    expect(screen.getByText("Soil Mix Demo")).toBeTruthy();
    expect(screen.getByLabelText("Selected commercial live live-1")).toBeTruthy();
    expect(screen.getByText(/Product product-1/)).toBeTruthy();
    expect(screen.getByText(/Course course-1/)).toBeTruthy();
    expect(screen.getByText(/Feed Campaign campaign-1/)).toBeTruthy();
    expect(screen.getByText(/Forum\/Q&A thread-1/)).toBeTruthy();
    expect(screen.getByText(/Interests living soil, dry amendments/)).toBeTruthy();
    expect(screen.getByText(/Channel ID 12345/)).toBeTruthy();
    expect(screen.getAllByText(/EventSub connected/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Embed https:\/\/player.twitch.tv\/\?channel=growpath/)
    ).toBeTruthy();
    expect(screen.getByText(/Replay https:\/\/twitch.tv\/videos\/1/)).toBeTruthy();
    expect(screen.getByText("Missing live setup")).toBeTruthy();
    expect(screen.getAllByText(/add thumbnail/).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByLabelText("Create setup task for Soil Mix Demo"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Complete live setup: Soil Mix Demo",
            sourceType: "live",
            sourceId: "live-1",
            sourceObjectId: "live-1",
            linkedLiveId: "live-1",
            linkedCourseId: "course-1",
            linkedProductId: "product-1",
            linkedFeedCampaignId: "campaign-1",
            linkedFeedPostId: "campaign-1",
            linkedForumThreadId: "thread-1",
            growInterests: ["living soil", "dry amendments"],
            liveStartsAt: "2026-07-10T20:00:00Z",
            liveEndsAt: "2026-07-10T21:00:00Z",
            liveVisibility: "public",
            twitchChannelName: "growpath",
            twitchChannelId: "12345",
            twitchEmbedUrl: "https://player.twitch.tv/?channel=growpath",
            eventSubStatus: "connected",
            replayUrl: "https://twitch.tv/videos/1",
            notificationPlan: ["24h_before", "1h_before", "15m_before"],
            recurrenceRule: "monthly",
            priority: "normal",
            status: "open",
            dueAt: "2026-07-10",
            allDay: false,
            calendarType: "live_setup_task",
            sourceStage: "live_setup_review",
            reminderPlan: { label: "1 hour before", channels: ["in_app"] }
          })
        })
      )
    );
    expect(screen.getByText("Created setup task for Soil Mix Demo.")).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Commercial live title"),
      "Friday mix demo"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live description"),
      "Build a 3-1-1 veg mix with live questions."
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live thumbnail"),
      "https://example.com/friday-live.jpg"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live Twitch channel"),
      "livingsoillabs"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live Twitch channel ID"),
      "67890"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live Twitch embed URL"),
      "https://player.twitch.tv/?channel=livingsoillabs"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live Twitch EventSub status"),
      "connected"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live scheduled start"),
      "2026-07-17T21:00:00Z"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live reminder"),
      "1 hour before"
    );
    fireEvent.changeText(screen.getByLabelText("Commercial live recurrence"), "weekly");
    fireEvent.press(screen.getByLabelText("Commercial live schedule all day toggle"));
    fireEvent.changeText(
      screen.getByLabelText("Commercial live related course"),
      "course-veg"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live related product"),
      "product-veg"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live related feed campaign"),
      "campaign-veg"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live Forum Q&A thread"),
      "thread-veg"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live grow interests"),
      "living soil, dry amendments"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live replay URL"),
      "https://twitch.tv/videos/veg"
    );
    fireEvent.press(screen.getByLabelText("Set commercial live visibility enrolled"));
    fireEvent.press(screen.getByLabelText("Schedule commercial live"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/lives", {
        method: "POST",
        body: expect.objectContaining({
          title: "Friday mix demo",
          description: "Build a 3-1-1 veg mix with live questions.",
          thumbnailUrl: "https://example.com/friday-live.jpg",
          scheduledStart: "2026-07-17T21:00:00Z",
          timezone: "America/New_York",
          reminderPreference: "1 hour before",
          recurrenceRule: "weekly",
          allDay: true,
          twitchChannelName: "livingsoillabs",
          twitchChannelId: "67890",
          twitchEmbedUrl: "https://player.twitch.tv/?channel=livingsoillabs",
          eventSubStatus: "connected",
          relatedCourseId: "course-veg",
          relatedProductId: "product-veg",
          relatedFeedCampaignId: "campaign-veg",
          relatedFeedPostId: "campaign-veg",
          forumThreadId: "thread-veg",
          growInterests: ["living soil", "dry amendments"],
          visibility: "enrolled",
          replayUrl: "https://twitch.tv/videos/veg",
          status: "scheduled",
          notificationPlan: expect.arrayContaining([
            "24h_before",
            "1h_before",
            "15m_before",
            "live_now",
            "replay_available"
          ])
        })
      })
    );
  });

  it("blocks scheduled commercial lives until setup is complete", async () => {
    const screen = render(<CommercialLivesRoute />);

    await waitFor(() => expect(screen.getByText("Lives / Twitch")).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Commercial live title"),
      "Incomplete scheduled live"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live scheduled start"),
      "2026-07-20T18:00:00Z"
    );

    expect(
      screen.getByLabelText("Schedule commercial live").props.accessibilityState?.disabled
    ).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalledWith(
      "/api/commercial/lives",
      expect.objectContaining({ method: "POST" })
    );
  });
});
