import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

import CreatorProfileRoute from "@/app/creators/[ownerId]";

const mockSearchVideos = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ ownerId: "owner-1" }),
  useRouter: () => ({ push: jest.fn() })
}));
jest.mock("@/api/videos", () => ({
  searchVideos: (...args: any[]) => mockSearchVideos(...args)
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ isAuthed: true, user: { id: "viewer-1" } })
}));
jest.mock("@/components/FollowButton", () => {
  const { Text } = require("react-native");
  return ({ userId }: any) => <Text accessibilityLabel={`Follow ${userId}`}>Follow</Text>;
});
jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));
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

describe("CreatorProfileRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchVideos.mockResolvedValue([
      {
        id: "video-1",
        title: "Propagation basics",
        owner: {
          id: "owner-1",
          displayName: "Living Soil Labs",
          workspaceType: "commercial"
        }
      }
    ]);
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
  });
});
