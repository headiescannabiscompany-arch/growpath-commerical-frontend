import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import LiveSessionsListScreen, { createStyles } from "@/screens/LiveSessionsListScreen";

const mockPush = jest.fn();
const mockApiRequest = jest.fn();
let mockAuth: any;

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuth
}));
jest.mock("@/components/FollowButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockFollowButton({ userId }: any) {
    return React.createElement(
      Text,
      { accessibilityLabel: `Follow ${userId}` },
      "Follow"
    );
  };
});
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const publicLives = [
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
];

describe("LiveSessionsListScreen", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue(publicLives);
    mockAuth = {
      isAuthed: true,
      user: { id: "viewer-1" },
      token: "test-session-1",
      isHydrating: false
    };
  });

  it("keeps counts unknown while pending or unavailable instead of showing zeros", async () => {
    let rejectRead!: (error: Error) => void;
    mockApiRequest.mockReturnValue(
      new Promise((_, reject) => {
        rejectRead = reject;
      })
    );
    const screen = render(<LiveSessionsListScreen />);
    expect(screen.queryAllByText("0")).toHaveLength(0);
    expect(screen.getAllByText("—")).toHaveLength(4);
    await act(async () => rejectRead(new Error("Directory offline")));
    expect(screen.getByText("Retry Lives")).toBeTruthy();
    expect(screen.queryAllByText("0")).toHaveLength(0);
    expect(screen.queryByText("No live sessions are published yet")).toBeNull();
  });

  it("treats an unexpected response as unavailable, not an empty directory", async () => {
    mockApiRequest.mockResolvedValue({ unexpected: true });
    const screen = render(<LiveSessionsListScreen />);
    expect(await screen.findByText("Retry Lives")).toBeTruthy();
    expect(screen.queryByText("No live sessions are published yet")).toBeNull();
  });

  it("waits for authentication hydration before fetching", async () => {
    mockAuth = { ...mockAuth, isHydrating: true };
    const screen = render(<LiveSessionsListScreen />);
    expect(mockApiRequest).not.toHaveBeenCalled();
    mockAuth = { ...mockAuth, isHydrating: false };
    screen.rerender(<LiveSessionsListScreen />);
    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledTimes(1));
  });

  it("drops old viewer results and ignores pending responses after an account change", async () => {
    let resolveOld!: (value: any) => void;
    mockApiRequest
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOld = resolve;
        })
      )
      .mockResolvedValueOnce([]);
    const screen = render(<LiveSessionsListScreen />);
    mockAuth = { ...mockAuth, user: { id: "viewer-2" }, token: "test-session-2" };
    screen.rerender(<LiveSessionsListScreen />);
    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledTimes(2));
    await act(async () => resolveOld(publicLives));
    expect(screen.queryByText("Living Soil Q&A")).toBeNull();
    expect(screen.getByText("No live sessions are published yet")).toBeTruthy();
  });

  it("preserves filters on retry and accepts repeated Retry clicks only once", async () => {
    let resolveRetry!: (value: any) => void;
    mockApiRequest.mockRejectedValueOnce(new Error("Offline")).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRetry = resolve;
      })
    );
    const screen = render(<LiveSessionsListScreen />);
    const retry = await screen.findByText("Retry Lives");
    fireEvent.changeText(screen.getByLabelText("Search live opportunities"), "Soil");
    fireEvent.press(screen.getByText("Replays"));
    act(() => {
      fireEvent.press(retry);
      fireEvent.press(retry);
    });
    expect(mockApiRequest).toHaveBeenCalledTimes(2);
    await act(async () => resolveRetry(publicLives));
    expect(screen.getByLabelText("Search live opportunities").props.value).toBe("Soil");
    expect(screen.getAllByText("Living Soil Q&A")).toHaveLength(1);
  });

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

  it("clears loaded results on sign-out and does not refetch for same-identity rerenders", async () => {
    const screen = render(<LiveSessionsListScreen />);
    await screen.findByText("Living Soil Q&A");
    mockAuth = { ...mockAuth, user: { ...mockAuth.user } };
    screen.rerender(<LiveSessionsListScreen />);
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    mockApiRequest.mockReturnValueOnce(new Promise(() => {}));
    mockAuth = { isAuthed: false, token: null, user: null, isHydrating: false };
    screen.rerender(<LiveSessionsListScreen />);
    expect(screen.queryByText("Living Soil Q&A")).toBeNull();
    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(mockApiRequest).toHaveBeenCalledTimes(2);
  });

  it.each(["lives", "sessions", "liveEvents", "items", "data"])(
    "retains the supported %s response envelope",
    async (field) => {
      mockApiRequest.mockResolvedValue({ [field]: publicLives });
      const screen = render(<LiveSessionsListScreen />);
      expect(await screen.findByText("Living Soil Q&A")).toBeTruthy();
    }
  );

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

  it("shows a retry action after a transient live-directory failure", async () => {
    mockApiRequest
      .mockRejectedValueOnce(new Error("Temporary live directory failure"))
      .mockResolvedValueOnce(publicLives);

    const screen = render(<LiveSessionsListScreen />);
    fireEvent.press(await screen.findByText("Retry Lives"));

    await waitFor(() =>
      expect(screen.getAllByText("Living Soil Q&A").length).toBeGreaterThan(0)
    );
    expect(mockApiRequest).toHaveBeenCalledTimes(2);
  });

  it("distinguishes an empty directory from an empty filtered result", async () => {
    mockApiRequest.mockResolvedValue([]);

    const screen = render(<LiveSessionsListScreen />);

    expect(
      await screen.findByRole("header", { name: "No live sessions are published yet" })
    ).toBeTruthy();
    expect(
      screen.getByText(/When creators publish a live, premiere, or replay/)
    ).toBeTruthy();
    expect(screen.queryByText(/Clear the filters/)).toBeNull();

    fireEvent.changeText(screen.getByLabelText("Search live opportunities"), "tomatoes");

    expect(
      screen.getByRole("header", { name: "No live opportunities matched" })
    ).toBeTruthy();
    expect(screen.getByText(/Clear the filters/)).toBeTruthy();
  });
});
