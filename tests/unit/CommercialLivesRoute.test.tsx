import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";

import CommercialLivesRoute from "@/app/home/commercial/lives";

const mockApiRequest = jest.fn();

function chooseDateTime(screen: ReturnType<typeof render>, label: string, value: string) {
  const [date, time] = value.split("T");
  const [year, month] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  fireEvent.press(screen.getByLabelText(label));
  fireEvent(screen.getByLabelText(`${label} year`), "valueChange", year);
  fireEvent(screen.getByLabelText(`${label} month`), "valueChange", month);
  fireEvent.press(screen.getByLabelText(`${label} day ${date}`));
  fireEvent(screen.getByLabelText(`${label} hour`), "valueChange", hour);
  fireEvent(screen.getByLabelText(`${label} minute`), "valueChange", minute);
  fireEvent.press(screen.getByLabelText(`${label} use selected date`));
}

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
  InlineError: ({ error }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(
      Text,
      null,
      `${error?.code || "ERROR"} ${error?.message || ""}`
    );
  }
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppPage({ children, header }: any) {
    return React.createElement(View, null, header, children);
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppCard({ children }: any) {
    return React.createElement(View, null, children);
  };
});

describe("CommercialLivesRoute", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/lives" && options?.params?.mine) {
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
      if (path === "/api/commercial/courses") {
        return Promise.resolve({
          courses: [{ id: "course-1", title: "Living Soil 101" }]
        });
      }
      if (path === "/api/commercial/products") {
        return Promise.resolve({
          products: [{ id: "product-1", name: "Living Soil Mix" }]
        });
      }
      if (path === "/api/commercial/feed") {
        return Promise.resolve({
          campaigns: [{ id: "campaign-1", title: "Friday Demo" }]
        });
      }
      if (path === "/api/forum/feed/latest") {
        return Promise.resolve({
          posts: [{ id: "thread-1", title: "Friday Questions" }]
        });
      }
      if (path === "/api/twitch/connect" && options?.method === "POST") {
        return Promise.resolve({
          configured: true,
          authorizationUrl: "https://id.twitch.tv/oauth2/authorize?state=test"
        });
      }
      if (path === "/api/lives" && options?.method === "POST") {
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

    await waitFor(() => expect(screen.getByText("Lives / Streaming")).toBeTruthy());

    expect(screen.queryByLabelText("Commercial live related course")).toBeNull();
    expect(
      await screen.findByLabelText("Use related course Living Soil 101")
    ).toBeTruthy();
    expect(screen.getByLabelText("Use related product Living Soil Mix")).toBeTruthy();
    expect(screen.getByLabelText("Use related Feed campaign Friday Demo")).toBeTruthy();
    expect(
      screen.getByLabelText("Use related Forum thread Friday Questions")
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Show advanced live record links"));

    [
      "Commercial live title",
      "Commercial live description",
      "Commercial live thumbnail",
      "Commercial live Twitch channel",
      "Commercial live Twitch channel ID",
      "Commercial live Twitch embed URL",
      "Commercial live timezone",
      "Commercial live related course",
      "Commercial live related product",
      "Commercial live related feed campaign",
      "Commercial live Forum Q&A thread",
      "Commercial live grow interests",
      "Commercial live replay URL"
    ].forEach((label) => {
      const input = screen.getByLabelText(label);
      expect(input.props.placeholderTextColor).toEqual(expect.any(String));
      expect(input.props.selectionColor).toEqual(expect.any(String));
    });

    expect(screen.getByText("Shared Schedule")).toBeTruthy();
    expect(screen.getByText("Notifications")).toBeTruthy();
    expect(screen.getByText("GrowPath · EventSub Connected")).toBeTruthy();
    expect(screen.getByLabelText("Disconnect Twitch")).toBeTruthy();
    expect(
      screen.getByRole("radio", {
        name: "Set commercial live visibility to Public"
      }).props.accessibilityState?.checked
    ).toBe(true);
    expect(
      screen.queryByRole("textbox", {
        name: "Commercial live Twitch EventSub status"
      })
    ).toBeNull();
    expect(screen.getByLabelText("Commercial live Twitch EventSub status")).toBeTruthy();
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
    expect(screen.getAllByText(/EventSub Connected/).length).toBeGreaterThan(0);
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
    chooseDateTime(screen, "Commercial live scheduled start", "2026-07-17T21:00");
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
    fireEvent.press(
      screen.getByLabelText("Set commercial live visibility to Followers only")
    );
    expect(
      screen.getByRole("radio", {
        name: "Set commercial live visibility to Followers only"
      }).props.accessibilityState?.checked
    ).toBe(true);
    fireEvent.press(screen.getByLabelText("Save commercial live private draft"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/lives", {
        method: "POST",
        body: expect.objectContaining({
          title: "Friday mix demo",
          description: "Build a 3-1-1 veg mix with live questions.",
          thumbnailUrl: "https://example.com/friday-live.jpg",
          scheduledStart: "2026-07-17T21:00",
          timezone: "America/New_York",
          reminderPreference: "1 hour before",
          recurrenceRule: "weekly",
          allDay: true,
          twitchChannelName: "livingsoillabs",
          twitchChannelId: "67890",
          twitchEmbedUrl: "https://player.twitch.tv/?channel=livingsoillabs",
          eventSubStatus: "connected",
          courseId: "course-veg",
          relatedProductId: "product-veg",
          relatedFeedCampaignId: "campaign-veg",
          relatedFeedPostId: "campaign-veg",
          forumThreadId: "thread-veg",
          growInterests: ["living soil", "dry amendments"],
          visibility: "followers",
          replayUrl: "https://twitch.tv/videos/veg",
          status: "draft",
          isPublished: false,
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

    await waitFor(() => expect(screen.getByText("Lives / Streaming")).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Commercial live title"),
      "Incomplete scheduled live"
    );
    chooseDateTime(screen, "Commercial live scheduled start", "2026-07-20T18:00");

    expect(
      screen.getByLabelText("Save commercial live private draft").props.accessibilityState
        ?.disabled
    ).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalledWith(
      "/api/lives",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("keeps a commercial schedule private until its explicit reviewed publish action", async () => {
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/lives" && options?.params?.mine) {
        return Promise.resolve({
          lives: [
            {
              id: "live-draft",
              title: "Reviewed product demo",
              description: "Complete live setup",
              thumbnailUrl: "https://example.com/live.jpg",
              status: "scheduled",
              isPublished: false,
              visibility: "public",
              scheduledStart: "2026-09-02T18:00:00Z",
              twitchChannelName: "growpath",
              twitchEmbedUrl: "https://player.twitch.tv/?channel=growpath",
              eventSubStatus: "connected",
              notificationPlan: ["24h_before", "1h_before"]
            }
          ]
        });
      }
      if (path === "/api/twitch/status") {
        return Promise.resolve({ configured: false, connection: null });
      }
      if (path === "/api/lives/live-draft/publish" && options?.method === "POST") {
        return Promise.resolve({
          session: {
            id: "live-draft",
            status: "scheduled",
            isPublished: true
          }
        });
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialLivesRoute />);

    expect(await screen.findByText("Preview Private Draft")).toBeTruthy();
    expect(screen.getByText("Edit in Live Studio")).toBeTruthy();
    fireEvent.press(
      screen.getByLabelText("Publish scheduled session Reviewed product demo")
    );
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/lives/live-draft/publish", {
        method: "POST",
        body: { goLiveNow: false }
      })
    );
    expect(screen.getByText("Reviewed commercial schedule published.")).toBeTruthy();
  });

  it("treats a missing Twitch status route as unavailable setup guidance", async () => {
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/lives" && options?.params?.mine) {
        return Promise.resolve({ lives: [] });
      }
      if (path === "/api/twitch/status") {
        return Promise.reject(
          Object.assign(new Error("Not found"), {
            code: "NOT_FOUND",
            status: 404
          })
        );
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialLivesRoute />);

    await waitFor(() =>
      expect(
        screen.getByText("Twitch OAuth is not configured on this deployment.")
      ).toBeTruthy()
    );
    expect(screen.queryByText(/NOT_FOUND/)).toBeNull();
    expect(screen.queryByText(/^Not found$/)).toBeNull();
    expect(
      screen.getByLabelText("Connect Twitch with OAuth").props.accessibilityState
        ?.disabled
    ).toBe(true);
  });

  it("keeps a retry path when the commercial live list fails temporarily", async () => {
    let listAttempts = 0;
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/lives" && options?.params?.mine) {
        listAttempts += 1;
        if (listAttempts === 1)
          return Promise.reject(new Error("Temporary list failure"));
        return Promise.resolve({
          lives: [
            {
              id: "commercial-recovered",
              title: "Recovered commercial live",
              status: "draft",
              isPublished: false
            }
          ]
        });
      }
      if (path === "/api/twitch/status") {
        return Promise.resolve({ configured: false, connection: null });
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialLivesRoute />);
    fireEvent.press(await screen.findByLabelText("Retry loading commercial lives"));

    expect(await screen.findByText("Recovered commercial live")).toBeTruthy();
    expect(listAttempts).toBe(2);
  });
});
