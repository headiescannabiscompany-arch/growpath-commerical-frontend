import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";

import CreatorProfileRoute from "@/app/creators/[ownerId]";

const mockSearchVideos = jest.fn();
const mockGetPublicCreatorProfile = jest.fn();
const mockRetryMe = jest.fn();
let mockParams: Record<string, unknown>;
let mockAuth: any;
let mockAccess: any;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: jest.fn() })
}));
jest.mock("@/api/videos", () => ({
  searchVideos: (...args: any[]) => mockSearchVideos(...args)
}));
jest.mock("@/api/creatorProfile", () => ({
  ...jest.requireActual("@/api/creatorProfile"),
  getPublicCreatorProfile: (...args: any[]) => mockGetPublicCreatorProfile(...args)
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuth
}));
jest.mock("@/entitlements", () => ({ useEntitlements: () => mockAccess }));
jest.mock("@/components/FollowButton", () => {
  const { Text } = require("react-native");
  return ({ userId }: any) => <Text accessibilityLabel={`Follow ${userId}`}>Follow</Text>;
});
jest.mock("@/components/layout/AppCard", () => {
  const { View } = require("react-native");
  return ({ children }: any) => <View>{children}</View>;
});
jest.mock("@/components/layout/AppPage", () => {
  const { View } = require("react-native");
  return ({ header, children }: any) => (
    <View>
      {header}
      {children}
    </View>
  );
});
jest.mock("@/components/videos/VideoCard", () => {
  const { Text } = require("react-native");
  return ({ video }: any) => <Text>{video.title}</Text>;
});
jest.mock("@/components/sharing/PublicShareActions", () => {
  const { Text } = require("react-native");
  return ({ title, path }: any) => (
    <Text testID="public-share-path">{`${title}: ${path}`}</Text>
  );
});

const published = (overrides = {}) => ({
  ownerId: "owner-1",
  displayName: "The Basil Journal",
  bio: "Learning one plant at a time.",
  links: [{ label: "My channel", url: "https://example.com/channel" }],
  publishedAt: "2026-10-09T02:00:00.000Z",
  ...overrides
});
const videoRows = (ownerId = "owner-1", title = "Propagation basics") => [
  {
    id: "video-1",
    title,
    owner: { id: ownerId, displayName: "Living Soil Labs", workspaceType: "commercial" }
  }
];
function deferred<T = any>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("CreatorProfileRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { ownerId: "owner-1", token: "must-not-share", from: "/private" };
    mockAuth = {
      isAuthed: true,
      isHydrating: false,
      token: "session-a",
      user: { id: "viewer-1" },
      retryMe: mockRetryMe
    };
    mockAccess = {
      ready: true,
      mode: "personal",
      facilityId: null,
      bootstrapError: null
    };
    mockGetPublicCreatorProfile.mockResolvedValue(null);
    mockSearchVideos.mockResolvedValue(videoRows());
    mockRetryMe.mockResolvedValue(undefined);
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });

  it("shows only the accessible creator library and canonical follow action", async () => {
    render(<CreatorProfileRoute />);

    await waitFor(() => expect(screen.getByText("Propagation basics")).toBeTruthy());
    expect(mockSearchVideos).toHaveBeenCalledWith({
      ownerId: "owner-1",
      sort: "new",
      limit: 50
    });
    expect(screen.getAllByText("Living Soil Labs").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Follow owner-1")).toBeTruthy();
    expect(screen.queryByTestId("public-share-path")).toBeNull();
  });

  it("shows a deliberately published profile before its first video, without sign-in", async () => {
    mockAuth = { ...mockAuth, isAuthed: false, user: null, token: null };
    mockSearchVideos.mockResolvedValue([]);
    mockGetPublicCreatorProfile.mockResolvedValue(published());
    render(<CreatorProfileRoute />);
    await waitFor(() =>
      expect(screen.getByText("Learning one plant at a time.")).toBeTruthy()
    );
    expect(screen.getAllByText("The Basil Journal")).toHaveLength(2);
    expect(
      screen.getByText("No videos are available to you from this creator yet.")
    ).toBeTruthy();
    expect(screen.queryByLabelText("Follow owner-1")).toBeNull();
    expect(screen.getByTestId("public-share-path").props.children).toBe(
      "The Basil Journal: /creators/owner-1"
    );
    expect(mockGetPublicCreatorProfile).toHaveBeenCalledWith("owner-1");
    expect(Linking.openURL).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("My channel (external website)"));
    expect(Linking.openURL).toHaveBeenCalledWith("https://example.com/channel");
  });

  it("does not follow self and renders only the public snapshot, never extra draft/account fields", async () => {
    mockAuth.user = { id: "owner-1", name: "Private account name" };
    mockGetPublicCreatorProfile.mockResolvedValue(
      published({
        draft: { displayName: "Private draft", bio: "Private thoughts" },
        email: "private@example.com",
        name: "Private legal name"
      })
    );
    render(<CreatorProfileRoute />);
    await waitFor(() =>
      expect(screen.getByText("Learning one plant at a time.")).toBeTruthy()
    );
    expect(screen.queryByLabelText("Follow owner-1")).toBeNull();
    expect(screen.queryByText(/Private|private@example/)).toBeNull();
  });

  it("keeps an absent/withdrawn profile private and does not invent a public name from the session", async () => {
    mockAuth.user = { id: "owner-1", name: "Private account name" };
    mockSearchVideos.mockResolvedValue([]);
    render(<CreatorProfileRoute />);
    await waitFor(() =>
      expect(screen.getByText("No public creator page is available.")).toBeTruthy()
    );
    expect(screen.queryByText("Private account name")).toBeNull();
    expect(screen.queryByTestId("public-share-path")).toBeNull();
    expect(screen.queryByLabelText("Follow owner-1")).toBeNull();
  });

  it("keeps a published profile usable when the video request fails and retries only videos", async () => {
    mockGetPublicCreatorProfile.mockResolvedValue(published());
    mockSearchVideos.mockRejectedValueOnce(new Error("Temporary network error"));
    render(<CreatorProfileRoute />);
    await waitFor(() =>
      expect(screen.getByText("Creator videos unavailable")).toBeTruthy()
    );
    expect(screen.getByText("Learning one plant at a time.")).toBeTruthy();
    expect(screen.queryByText(/0 videos|No videos are available/)).toBeNull();
    fireEvent.press(screen.getByLabelText("Retry creator videos unavailable"));
    await waitFor(() => expect(screen.getByText("Propagation basics")).toBeTruthy());
    expect(mockGetPublicCreatorProfile).toHaveBeenCalledTimes(1);
    expect(mockSearchVideos).toHaveBeenCalledTimes(2);
  });

  it("does not treat a profile fetch failure as unpublished and preserves authorized videos", async () => {
    mockGetPublicCreatorProfile.mockRejectedValueOnce(
      new Error("Temporary network error")
    );
    render(<CreatorProfileRoute />);
    await waitFor(() =>
      expect(screen.getByText("Creator profile unavailable")).toBeTruthy()
    );
    expect(screen.getByText("Propagation basics")).toBeTruthy();
    expect(screen.queryByText("No public creator page is available.")).toBeNull();
    expect(screen.queryByTestId("public-share-path")).toBeNull();
    const read = deferred();
    mockGetPublicCreatorProfile.mockReturnValueOnce(read.promise);
    const retry = screen.getByLabelText("Retry creator profile unavailable");
    act(() => {
      fireEvent.press(retry);
      fireEvent.press(retry);
    });
    expect(mockGetPublicCreatorProfile).toHaveBeenCalledTimes(2);
    await act(async () => read.resolve(published()));
    expect(screen.getByText("Learning one plant at a time.")).toBeTruthy();
    expect(mockSearchVideos).toHaveBeenCalledTimes(1);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,hello",
    "http://example.com",
    "https://user:secret@example.com",
    "https://example.com/\nunsafe",
    "not a URL"
  ])("does not display or open unsafe external link %s", async (url) => {
    mockGetPublicCreatorProfile.mockResolvedValue(
      published({ links: [{ label: "Unsafe destination", url }] })
    );
    render(<CreatorProfileRoute />);
    await waitFor(() =>
      expect(screen.getByText("Learning one plant at a time.")).toBeTruthy()
    );
    expect(screen.queryByLabelText("Unsafe destination (external website)")).toBeNull();
    expect(screen.queryByText(url)).toBeNull();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it("reports external navigation failure without removing the published page", async () => {
    mockGetPublicCreatorProfile.mockResolvedValue(published());
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error("Cannot open"));
    render(<CreatorProfileRoute />);
    await waitFor(() =>
      expect(screen.getByLabelText("My channel (external website)")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("My channel (external website)"));
    await waitFor(() =>
      expect(
        screen.getByText("This external link could not be opened. Please try again.")
      ).toBeTruthy()
    );
    expect(screen.getByText("Learning one plant at a time.")).toBeTruthy();
  });

  it.each(["authentication", "entitlements"])(
    "does not read or expose content while %s is unresolved",
    async (source) => {
      if (source === "authentication") mockAuth.isHydrating = true;
      else mockAccess.ready = false;
      const view = render(<CreatorProfileRoute />);
      expect(mockGetPublicCreatorProfile).not.toHaveBeenCalled();
      expect(mockSearchVideos).not.toHaveBeenCalled();
      expect(screen.queryByLabelText("Follow owner-1")).toBeNull();
      mockAuth.isHydrating = false;
      mockAccess.ready = true;
      view.rerender(<CreatorProfileRoute />);
      await waitFor(() => expect(screen.getByText("Propagation basics")).toBeTruthy());
    }
  );

  it("offers recoverable access-check retry without starting record requests", async () => {
    mockAccess = { ...mockAccess, ready: false, bootstrapError: new Error("offline") };
    render(<CreatorProfileRoute />);
    fireEvent.press(screen.getByLabelText("Retry video access"));
    await waitFor(() => expect(mockRetryMe).toHaveBeenCalledTimes(1));
    expect(mockGetPublicCreatorProfile).not.toHaveBeenCalled();
    expect(mockSearchVideos).not.toHaveBeenCalled();
  });

  it("immediately clears previous owner data and ignores late profile/video responses", async () => {
    const oldProfile = deferred();
    const oldVideos = deferred();
    mockGetPublicCreatorProfile.mockReturnValueOnce(oldProfile.promise);
    mockSearchVideos.mockReturnValueOnce(oldVideos.promise);
    const view = render(<CreatorProfileRoute />);
    mockParams = { ownerId: "owner-2" };
    mockGetPublicCreatorProfile.mockResolvedValue(
      published({
        ownerId: "owner-2",
        displayName: "Second creator",
        bio: "Second bio",
        links: []
      })
    );
    mockSearchVideos.mockResolvedValue(videoRows("owner-2", "Second video"));
    view.rerender(<CreatorProfileRoute />);
    await waitFor(() => expect(screen.getByText("Second bio")).toBeTruthy());
    await act(async () => {
      oldProfile.resolve(published());
      oldVideos.resolve(videoRows());
    });
    expect(screen.queryByText("Learning one plant at a time.")).toBeNull();
    expect(screen.queryByText("Propagation basics")).toBeNull();
    expect(screen.getByText("Second video")).toBeTruthy();
    expect(screen.getByTestId("public-share-path").props.children).toBe(
      "Second creator: /creators/owner-2"
    );
  });

  it.each(["token", "account", "mode", "facility", "signout"])(
    "clears profile, videos and follow state on %s changes before reloading",
    async (change) => {
      mockGetPublicCreatorProfile.mockResolvedValueOnce(published());
      const view = render(<CreatorProfileRoute />);
      await waitFor(() =>
        expect(screen.getByText("Learning one plant at a time.")).toBeTruthy()
      );
      const nextProfile = deferred();
      const nextVideos = deferred();
      mockGetPublicCreatorProfile.mockReturnValueOnce(nextProfile.promise);
      mockSearchVideos.mockReturnValueOnce(nextVideos.promise);
      if (change === "token") mockAuth.token = "session-b";
      if (change === "account") mockAuth.user = { id: "different-viewer" };
      if (change === "mode") mockAccess.mode = "commercial";
      if (change === "facility") mockAccess.facilityId = "facility-b";
      if (change === "signout")
        mockAuth = { ...mockAuth, isAuthed: false, user: null, token: null };
      view.rerender(<CreatorProfileRoute />);
      expect(screen.queryByText("Learning one plant at a time.")).toBeNull();
      expect(screen.queryByText("Propagation basics")).toBeNull();
      expect(screen.queryByLabelText("Follow owner-1")).toBeNull();
      expect(screen.queryByTestId("public-share-path")).toBeNull();
      await act(async () => {
        nextProfile.resolve(null);
        nextVideos.resolve([]);
      });
      expect(screen.getByText("No public creator page is available.")).toBeTruthy();
    }
  );

  it("rejects mismatched public profile identity without displaying its fields", async () => {
    mockGetPublicCreatorProfile.mockResolvedValue(
      published({ ownerId: "different-owner" })
    );
    mockSearchVideos.mockResolvedValue([]);
    render(<CreatorProfileRoute />);
    await waitFor(() =>
      expect(screen.getByText("Creator profile unavailable")).toBeTruthy()
    );
    expect(screen.queryByText("Learning one plant at a time.")).toBeNull();
    expect(screen.queryByTestId("public-share-path")).toBeNull();
    expect(screen.queryByText("No public creator page is available.")).toBeNull();
  });

  it("rejects mismatched video owners without hiding a verified public profile", async () => {
    mockGetPublicCreatorProfile.mockResolvedValue(published());
    mockSearchVideos.mockResolvedValue(videoRows("different-owner", "Wrong-owner video"));
    render(<CreatorProfileRoute />);
    await waitFor(() =>
      expect(screen.getByText("Creator videos unavailable")).toBeTruthy()
    );
    expect(screen.queryByText("Wrong-owner video")).toBeNull();
    expect(screen.getByText("Learning one plant at a time.")).toBeTruthy();
  });

  it("does not request malformed owner routes or share untrusted query paths", async () => {
    mockParams = { ownerId: "owner-1?token=secret" };
    render(<CreatorProfileRoute />);
    await waitFor(() =>
      expect(screen.getByText("Creator profile unavailable")).toBeTruthy()
    );
    expect(mockGetPublicCreatorProfile).not.toHaveBeenCalled();
    expect(mockSearchVideos).not.toHaveBeenCalled();
    expect(screen.queryByTestId("public-share-path")).toBeNull();
  });
});
