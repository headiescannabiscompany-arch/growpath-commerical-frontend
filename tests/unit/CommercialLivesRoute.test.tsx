import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialLivesRoute from "@/app/home/commercial/lives";

const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children)
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
              twitchChannelName: "growpath",
              twitchChannelId: "12345",
              twitchEmbedUrl: "https://player.twitch.tv/?channel=growpath",
              eventSubStatus: "connected",
              relatedProductId: "product-1",
              relatedCourseId: "course-1",
              relatedFeedPostId: "campaign-1",
              forumThreadId: "thread-1",
              replayUrl: "https://twitch.tv/videos/1"
            }
          ]
        });
      }
      if (path === "/api/commercial/lives" && options?.method === "POST") {
        return Promise.resolve({ live: { id: "live-new", ...options.body } });
      }
      return Promise.resolve({});
    });
  });

  it("schedules lives with course, product, feed, forum, replay, and reminder links", async () => {
    const screen = render(<CommercialLivesRoute />);

    await waitFor(() => expect(screen.getByText("Lives / Twitch")).toBeTruthy());

    expect(screen.getByText("Soil Mix Demo")).toBeTruthy();
    expect(screen.getByText(/Product product-1/)).toBeTruthy();
    expect(screen.getByText(/Course course-1/)).toBeTruthy();
    expect(screen.getByText(/Feed campaign-1/)).toBeTruthy();
    expect(screen.getByText(/Forum\/Q&A thread-1/)).toBeTruthy();
    expect(screen.getByText(/Channel ID 12345/)).toBeTruthy();
    expect(screen.getByText(/EventSub connected/)).toBeTruthy();
    expect(
      screen.getByText(/Embed https:\/\/player.twitch.tv\/\?channel=growpath/)
    ).toBeTruthy();
    expect(screen.getByText(/Replay https:\/\/twitch.tv\/videos\/1/)).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Commercial live title"),
      "Friday mix demo"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live description"),
      "Build a 3-1-1 veg mix with live questions."
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
      "pending"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial live scheduled start"),
      "2026-07-17T21:00:00Z"
    );
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
          scheduledStart: "2026-07-17T21:00:00Z",
          timezone: "America/New_York",
          twitchChannelName: "livingsoillabs",
          twitchChannelId: "67890",
          twitchEmbedUrl: "https://player.twitch.tv/?channel=livingsoillabs",
          eventSubStatus: "pending",
          relatedCourseId: "course-veg",
          relatedProductId: "product-veg",
          relatedFeedPostId: "campaign-veg",
          forumThreadId: "thread-veg",
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
});
