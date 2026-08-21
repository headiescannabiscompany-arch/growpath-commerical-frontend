import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import LiveStudioRoute from "@/app/live-studio";

const mockListVideoLibrary = jest.fn();
const mockGetDiscordLiveConnection = jest.fn();
const mockGetHostedLiveStatus = jest.fn();
const mockListHostedLiveChannels = jest.fn();
const mockListLives = jest.fn();
const mockDeleteLive = jest.fn();
const mockGetLive = jest.fn();
const mockPublishLive = jest.fn();
const mockUpdateLive = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ isAuthed: true, user: { id: "host-1" } })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ mode: "personal", facilityId: null })
}));

jest.mock("@/api/lives", () => ({
  createLive: jest.fn(),
  deleteLive: (...args: any[]) => mockDeleteLive(...args),
  getLive: (...args: any[]) => mockGetLive(...args),
  getHostedLiveStatus: (...args: any[]) => mockGetHostedLiveStatus(...args),
  listLives: (...args: any[]) => mockListLives(...args),
  listHostedLiveChannels: (...args: any[]) => mockListHostedLiveChannels(...args),
  publishLive: (...args: any[]) => mockPublishLive(...args),
  provisionHostedLiveInput: jest.fn(),
  updateLive: (...args: any[]) => mockUpdateLive(...args)
}));
jest.mock("@/api/videos", () => ({
  listVideoLibrary: (...args: any[]) => mockListVideoLibrary(...args)
}));
jest.mock("@/api/discordLive", () => ({
  getDiscordLiveConnection: (...args: any[]) => mockGetDiscordLiveConnection(...args),
  connectDiscordLive: jest.fn(),
  testDiscordLiveConnection: jest.fn(),
  disconnectDiscordLive: jest.fn()
}));

jest.mock("@/components/nav/BackButton", () => () => null);
jest.mock("@/components/schedule/SchedulePicker", () => () => null);

describe("LiveStudioRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    mockListVideoLibrary.mockResolvedValue({ videos: [] });
    mockGetDiscordLiveConnection.mockResolvedValue({
      configured: false,
      connection: null
    });
    mockGetHostedLiveStatus.mockResolvedValue({
      enabled: true,
      remainingMonthlyMinutes: 120,
      limits: { monthlyMinutes: 120, sessionMinutes: 60 }
    });
    mockListHostedLiveChannels.mockResolvedValue([]);
    mockListLives.mockResolvedValue([]);
    mockDeleteLive.mockResolvedValue({ success: true });
    mockPublishLive.mockResolvedValue({
      session: { id: "draft-1", status: "scheduled", isPublished: true }
    });
    mockUpdateLive.mockResolvedValue({
      id: "draft-1",
      title: "Updated draft",
      status: "draft",
      isPublished: false
    });
  });

  it("offers all-account live and premiere creation without a GrowPath picker", async () => {
    render(<LiveStudioRoute />);

    await waitFor(() => expect(mockGetDiscordLiveConnection).toHaveBeenCalled());

    expect(screen.getByText("Create a live or video premiere")).toBeTruthy();
    expect(
      screen.getByText(/Available to Personal, Commercial, and Facility accounts/i)
    ).toBeTruthy();
    expect(screen.getByText("Live stream")).toBeTruthy();
    expect(screen.getByText("Video premiere")).toBeTruthy();
    expect(screen.getByText("Choose how you broadcast")).toBeTruthy();
    expect(screen.getByText("Use an outside live URL")).toBeTruthy();
    expect(screen.getByText("Broadcast live in GrowPath")).toBeTruthy();
    expect(screen.getByText("Twitch")).toBeTruthy();
    expect(screen.getByText("YouTube")).toBeTruthy();
    expect(screen.getByText("Kick")).toBeTruthy();
    expect(screen.getByText("Facebook Live")).toBeTruthy();
    expect(screen.getByText("Instagram Live")).toBeTruthy();
    expect(screen.getByText("Playback and broadcast controls")).toBeTruthy();
    expect(screen.getByText(/watching inside GrowPath.*volume/i)).toBeTruthy();
    expect(screen.getByText(/Broadcasters use OBS.*control cameras/i)).toBeTruthy();
    expect(screen.getByText(/GrowPath does not pick winners/i)).toBeTruthy();
    expect(screen.getByText("Discord live announcements")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Connect Discord channel" })).toBeTruthy();
  });

  it("defaults hosted broadcasts to the account's saved OBS channel", async () => {
    mockListHostedLiveChannels.mockResolvedValue([
      { id: "channel-1", label: "GrowPathAI production OBS", lifecycle: "ready" },
      { id: "channel-2", label: "Backup OBS", lifecycle: "ready" }
    ]);

    render(<LiveStudioRoute />);

    fireEvent.press(
      await screen.findByRole("radio", { name: "Broadcast live in GrowPath" })
    );

    await waitFor(() =>
      expect(
        screen.getByRole("radio", { name: "GrowPathAI production OBS" }).props
          .accessibilityState
      ).toEqual({ checked: true })
    );
    expect(
      screen.getByRole("radio", { name: "New channel" }).props.accessibilityState
    ).toEqual({ checked: false });
  });

  it("opens and safely deletes the host's private drafts", async () => {
    mockListLives.mockResolvedValue([
      {
        id: "draft-1",
        title: "Spring garden Q&A",
        isPublished: false,
        status: "draft",
        sessionType: "live"
      }
    ]);

    render(<LiveStudioRoute />);

    expect(await screen.findByText("Your live sessions")).toBeTruthy();
    expect(await screen.findByText("Spring garden Q&A")).toBeTruthy();
    expect(await screen.findByText("Private draft · Live stream")).toBeTruthy();
    expect(screen.queryByText("Private draft · Live")).toBeNull();
    expect(mockListLives).toHaveBeenCalledWith({ mine: true });

    fireEvent.press(screen.getByRole("button", { name: "Delete Spring garden Q&A" }));
    fireEvent.press(
      screen.getByRole("button", { name: "Confirm delete Spring garden Q&A" })
    );

    await waitFor(() => expect(mockDeleteLive).toHaveBeenCalledWith("draft-1"));
    await waitFor(() => expect(screen.queryByText("Spring garden Q&A")).toBeNull());
  });

  it("keeps a retry path when the host session list fails temporarily", async () => {
    mockListLives
      .mockRejectedValueOnce(new Error("Temporary session failure"))
      .mockResolvedValueOnce([
        {
          id: "draft-recovered",
          title: "Recovered private draft",
          isPublished: false,
          status: "draft",
          sessionType: "live"
        }
      ]);

    render(<LiveStudioRoute />);

    fireEvent.press(
      await screen.findByRole("button", {
        name: "Retry loading your live sessions"
      })
    );

    expect(await screen.findByText("Recovered private draft")).toBeTruthy();
    expect(mockListLives).toHaveBeenCalledTimes(2);
  });

  it("uses a separate reviewed publish action for a scheduled private draft", async () => {
    mockListLives.mockResolvedValue([
      {
        id: "draft-1",
        title: "Reviewed garden Q&A",
        isPublished: false,
        status: "scheduled",
        startsAt: "2026-09-01T18:00:00Z",
        sessionType: "live"
      }
    ]);

    render(<LiveStudioRoute />);

    fireEvent.press(
      await screen.findByRole("button", {
        name: "Publish scheduled session Reviewed garden Q&A"
      })
    );
    await waitFor(() =>
      expect(mockPublishLive).toHaveBeenCalledWith("draft-1", { goLiveNow: false })
    );
    expect(
      screen.queryByRole("button", { name: "Delete Reviewed garden Q&A" })
    ).toBeNull();
    expect(
      await screen.findByText("The reviewed scheduled session is published.")
    ).toBeTruthy();
  });

  it("loads a private draft into the shared editor and saves without publishing", async () => {
    mockSearchParams = { editSessionId: "draft-1" };
    mockGetLive.mockResolvedValue({
      id: "draft-1",
      title: "Original draft",
      description: "Review me",
      status: "draft",
      isPublished: false,
      sessionType: "live",
      broadcastMode: "external",
      streamPlatform: "twitch",
      twitchChannel: "growpath"
    });

    render(<LiveStudioRoute />);

    const title = await screen.findByLabelText("Live session title");
    fireEvent.changeText(title, "Updated draft");
    fireEvent.press(screen.getByRole("button", { name: "Save private draft changes" }));

    await waitFor(() =>
      expect(mockUpdateLive).toHaveBeenCalledWith(
        "draft-1",
        expect.objectContaining({
          title: "Updated draft",
          status: "draft",
          isPublished: false
        })
      )
    );
    expect(mockPublishLive).not.toHaveBeenCalled();
  });
});
