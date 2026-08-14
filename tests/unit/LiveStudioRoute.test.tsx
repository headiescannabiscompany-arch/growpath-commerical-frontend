import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

import LiveStudioRoute from "@/app/live-studio";

const mockListVideoLibrary = jest.fn();
const mockGetDiscordLiveConnection = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ isAuthed: true, user: { id: "host-1" } })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ mode: "personal", facilityId: null })
}));

jest.mock("@/api/lives", () => ({ createLive: jest.fn() }));
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
    mockListVideoLibrary.mockResolvedValue({ videos: [] });
    mockGetDiscordLiveConnection.mockResolvedValue({
      configured: false,
      connection: null
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
    expect(screen.getByText("Where are you streaming?")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Stream on Twitch" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Stream on YouTube" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Stream on Kick" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Stream on Facebook Live" })).toBeTruthy();
    expect(screen.getByText("Playback and broadcast controls")).toBeTruthy();
    expect(screen.getByText(/watching inside GrowPath.*volume/i)).toBeTruthy();
    expect(screen.getByText(/Broadcasters use OBS.*control cameras/i)).toBeTruthy();
    expect(screen.getByText(/GrowPath does not pick winners/i)).toBeTruthy();
    expect(screen.getByText("Discord live announcements")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Connect Discord channel" })).toBeTruthy();
  });
});
