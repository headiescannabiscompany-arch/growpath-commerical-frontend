import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import LiveSessionsListScreen from "@/screens/LiveSessionsListScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: () =>
    Promise.resolve([
      {
        _id: "live-1",
        title: "Living Soil Q&A",
        description: "Mix review",
        twitchChannel: "growpath",
        startsAt: "2026-08-02T18:00:00Z",
        accessLevel: "free",
        isPublished: true,
        rsvpCount: 4,
        replayUrl: "https://twitch.tv/videos/1"
      }
    ])
}));

describe("LiveSessionsListScreen", () => {
  it("lists public live and replay records and opens the shared player", async () => {
    const screen = render(<LiveSessionsListScreen />);
    await waitFor(() => expect(screen.getAllByText("Living Soil Q&A").length).toBeGreaterThan(0));
    expect(screen.getAllByText(/4 RSVPs/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Replay$/).length).toBeGreaterThan(0);
    fireEvent.press(screen.getAllByText("Open session")[0]);
    expect(mockPush).toHaveBeenCalledWith("/live-session?sessionId=live-1");
  });
});
