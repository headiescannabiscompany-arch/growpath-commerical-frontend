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
    await waitFor(() => expect(screen.getByText("Living Soil Q&A")).toBeTruthy());
    expect(screen.getByText("RSVPs: 4")).toBeTruthy();
    expect(screen.getByText("Replay available")).toBeTruthy();
    fireEvent.press(screen.getByText("Living Soil Q&A"));
    expect(mockPush).toHaveBeenCalledWith("/live-session?sessionId=live-1");
  });
});
