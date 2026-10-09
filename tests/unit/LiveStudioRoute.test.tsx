import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { createLive, provisionHostedLiveInput } from "@/api/lives";

import LiveStudioRoute, { createLiveStudioStyles } from "@/app/live-studio";
import { getThemePalette } from "@/theme/appTheme";

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
let mockHostId = "host-1";
const mockBackButton = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ isAuthed: true, user: { id: mockHostId } })
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

jest.mock("@/components/nav/BackButton", () => (props: any) => {
  mockBackButton(props);
  return null;
});
jest.mock("@/components/schedule/SchedulePicker", () => () => null);

describe("LiveStudioRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    mockHostId = "host-1";
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

  it.each(["day", "night"] as const)(
    "uses the active %s palette for the root scroll viewport",
    (mode) => {
      const palette = getThemePalette(mode, mode);
      const styles = createLiveStudioStyles(palette);

      expect(styles.page.backgroundColor).toBe(palette.page);
      expect(styles.container.backgroundColor).toBe(palette.page);
    }
  );

  it.each(["personal-more", "https://example.com", undefined])(
    "uses a fixed More return only for its source marker %j",
    async (from) => {
      mockSearchParams = from ? { from } : {};
      render(<LiveStudioRoute />);
      await waitFor(() => expect(mockGetHostedLiveStatus).toHaveBeenCalled());
      expect(mockBackButton).toHaveBeenCalledWith(
        expect.objectContaining({
          fallbackHref: from === "personal-more" ? "/home/personal/more" : "/lives",
          preferFallback: from === "personal-more"
        })
      );
      expect(createLive).not.toHaveBeenCalled();
      expect(provisionHostedLiveInput).not.toHaveBeenCalled();
    }
  );

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

  it("keeps pending hosting separate from disabled and blocks hosted saving", async () => {
    let resolveStatus!: (value: any) => void;
    mockGetHostedLiveStatus.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStatus = resolve;
      })
    );
    render(<LiveStudioRoute />);
    fireEvent.press(screen.getByRole("radio", { name: "Broadcast live in GrowPath" }));
    expect(screen.getByText("Checking hosted broadcasting...")).toBeTruthy();
    expect(
      screen.queryByText("GrowPath-hosted broadcasting is not activated yet")
    ).toBeNull();
    fireEvent.changeText(
      screen.getByLabelText("Live session title"),
      "Private readiness draft"
    );
    fireEvent.press(screen.getByRole("button", { name: "Save private draft" }));
    expect(createLive).not.toHaveBeenCalled();
    await act(async () => resolveStatus({ enabled: true }));
    expect(await screen.findByText("Your reusable OBS connection")).toBeTruthy();
  });

  it.each(["status", "channels"])(
    "recovers a failed %s read without losing the draft or writing",
    async (failure) => {
      (failure === "status"
        ? mockGetHostedLiveStatus
        : mockListHostedLiveChannels
      ).mockRejectedValueOnce(new Error("Temporary failure"));
      render(<LiveStudioRoute />);
      fireEvent.press(screen.getByRole("radio", { name: "Broadcast live in GrowPath" }));
      await screen.findByText("Hosted broadcasting readiness is unavailable");
      expect(
        screen.queryByText("GrowPath-hosted broadcasting is not activated yet")
      ).toBeNull();
      fireEvent.changeText(screen.getByLabelText("Live session title"), "Keep my show");
      let resolveChannels!: (value: any) => void;
      mockListHostedLiveChannels.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveChannels = resolve;
        })
      );
      const retry = screen.getByRole("button", {
        name: "Retry hosted broadcasting readiness"
      });
      act(() => {
        fireEvent.press(retry);
        fireEvent.press(retry);
      });
      await waitFor(() => expect(mockListHostedLiveChannels).toHaveBeenCalledTimes(2));
      expect(screen.getByText("Checking hosted broadcasting...")).toBeTruthy();
      await act(async () => resolveChannels([{ id: "saved", label: "Saved OBS" }]));
      expect(await screen.findByRole("radio", { name: "Saved OBS" })).toBeTruthy();
      expect(screen.getByLabelText("Live session title").props.value).toBe(
        "Keep my show"
      );
      expect(createLive).not.toHaveBeenCalled();
      expect(provisionHostedLiveInput).not.toHaveBeenCalled();
      expect(mockUpdateLive).not.toHaveBeenCalled();
      expect(mockPublishLive).not.toHaveBeenCalled();
    }
  );

  it("only shows disabled after a successful disabled response and leaves outside URLs available", async () => {
    mockGetHostedLiveStatus.mockResolvedValueOnce({ enabled: false });
    render(<LiveStudioRoute />);
    fireEvent.press(screen.getByRole("radio", { name: "Broadcast live in GrowPath" }));
    expect(
      await screen.findByText("GrowPath-hosted broadcasting is not activated yet")
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Save private draft" }).props.accessibilityState
        .disabled
    ).toBe(true);
    fireEvent.press(screen.getByRole("radio", { name: "Use an outside live URL" }));
    expect(screen.getByLabelText("Twitch channel viewers will watch")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Save private draft" }).props.accessibilityState
        .disabled
    ).toBe(false);
  });

  it("treats an incomplete status response as unavailable, not disabled", async () => {
    mockGetHostedLiveStatus.mockResolvedValueOnce({});
    render(<LiveStudioRoute />);
    fireEvent.press(screen.getByRole("radio", { name: "Broadcast live in GrowPath" }));
    expect(
      await screen.findByText("Hosted broadcasting readiness is unavailable")
    ).toBeTruthy();
  });

  it("ignores old-account readiness and channels after switching identity", async () => {
    let resolveOld!: (value: any) => void;
    mockGetHostedLiveStatus.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      })
    );
    mockListHostedLiveChannels.mockResolvedValueOnce([
      { id: "old", label: "Old account OBS" }
    ]);
    const view = render(<LiveStudioRoute />);
    fireEvent.press(screen.getByRole("radio", { name: "Broadcast live in GrowPath" }));
    mockHostId = "host-2";
    mockListHostedLiveChannels.mockResolvedValueOnce([
      { id: "new", label: "Current account OBS" }
    ]);
    view.rerender(<LiveStudioRoute />);
    await screen.findByRole("radio", { name: "Current account OBS" });
    await act(async () => resolveOld({ enabled: false }));
    expect(screen.queryByText("Old account OBS")).toBeNull();
    expect(
      screen.queryByText("GrowPath-hosted broadcasting is not activated yet")
    ).toBeNull();
    expect(screen.getByRole("radio", { name: "Current account OBS" })).toBeTruthy();
  });

  it("keeps an edited draft's saved channel through a failed check and retry", async () => {
    mockSearchParams = { editSessionId: "draft-hosted" };
    mockGetLive.mockResolvedValueOnce({
      id: "draft-hosted",
      title: "Saved draft",
      broadcastMode: "growpath",
      hostedLive: { channelId: "selected" }
    });
    mockListHostedLiveChannels.mockRejectedValueOnce(new Error("Temporary failure"));
    render(<LiveStudioRoute />);
    await screen.findByText("Hosted broadcasting readiness is unavailable");
    mockListHostedLiveChannels.mockResolvedValueOnce([
      { id: "first", label: "First OBS" },
      { id: "selected", label: "Selected OBS" }
    ]);
    fireEvent.press(
      screen.getByRole("button", { name: "Retry hosted broadcasting readiness" })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("radio", { name: "Selected OBS" }).props.accessibilityState
          .checked
      ).toBe(true)
    );
    expect(screen.getByLabelText("Live session title").props.value).toBe("Saved draft");
    expect(mockUpdateLive).not.toHaveBeenCalled();
  });

  it("does not perform work when a pending readiness request completes after unmount", async () => {
    let resolveStatus!: (value: any) => void;
    mockGetHostedLiveStatus.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStatus = resolve;
      })
    );
    const view = render(<LiveStudioRoute />);
    view.unmount();
    await act(async () => resolveStatus({ enabled: true }));
    expect(createLive).not.toHaveBeenCalled();
    expect(provisionHostedLiveInput).not.toHaveBeenCalled();
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
