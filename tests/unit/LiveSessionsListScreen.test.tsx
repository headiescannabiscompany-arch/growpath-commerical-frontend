import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import LiveSessionsListScreen, { createStyles } from "@/screens/LiveSessionsListScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ isAuthed: true, user: { id: "viewer-1" } })
}));
jest.mock("@/components/FollowButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ userId }: any) =>
    React.createElement(Text, { accessibilityLabel: `Follow ${userId}` }, "Follow");
});
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
        owner: {
          id: "creator-1",
          displayName: "Living Soil Labs",
          avatarUrl: "https://example.com/creator.jpg"
        },
        isPublished: true,
        rsvpCount: 4,
        replayUrl: "https://twitch.tv/videos/1"
      }
    ])
}));

describe("LiveSessionsListScreen", () => {
  it("uses the active palette for every shared browser surface", () => {
    const palette = {
      page: "#0E141B",
      hero: "#101823",
      heroText: "#FFFFFF",
      heroMuted: "#E4ECF5",
      surface: "#151D27",
      surfaceMuted: "#1A2330",
      surfaceStrong: "#202B39",
      border: "#283545",
      borderSoft: "#334355",
      text: "#F4F7FB",
      textMuted: "#C9D4DF",
      textSoft: "#DEE7F0",
      accent: "#78AAFF",
      accentSoft: "#16263A",
      accentText: "#FFFFFF",
      info: "#78AAFF",
      danger: "#E29B9B"
    } as any;

    const styles = createStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.hero).toEqual(
      expect.objectContaining({
        backgroundColor: palette.hero,
        borderColor: palette.border
      })
    );
    expect(styles.statCard.backgroundColor).toBe(palette.surface);
    expect(styles.searchInput).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.filterChip.backgroundColor).toBe(palette.surface);
    expect(styles.sessionCard.backgroundColor).toBe(palette.surface);
    expect(styles.emptyCard.backgroundColor).toBe(palette.surface);
    expect(styles.title.color).toBe(palette.heroText);
    expect(styles.sectionTitle.color).toBe(palette.text);
  });

  it("lists public live and replay records and opens the shared player", async () => {
    const screen = render(<LiveSessionsListScreen />);
    await waitFor(() =>
      expect(screen.getAllByText("Living Soil Q&A").length).toBeGreaterThan(0)
    );
    expect(screen.getAllByText(/4 RSVPs/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Replay$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hosted by Living Soil Labs").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Follow creator-1").length).toBeGreaterThan(0);
    expect(screen.getByRole("header", { name: "Lives" })).toHaveProp("aria-level", 1);
    fireEvent.press(screen.getAllByText("Open session")[0]);
    expect(mockPush).toHaveBeenCalledWith("/live-session?sessionId=live-1");
  });
});
