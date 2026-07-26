import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockSearchVideos = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/components/layout/AppPage", () => ({
  __esModule: true,
  default: ({ header, children }: any) => {
    const MockView = require("react-native").View;
    return (
      <MockView>
        {header}
        {children}
      </MockView>
    );
  }
}));

jest.mock("@/components/layout/AppCard", () => ({
  __esModule: true,
  default: ({ children }: any) => {
    const MockView = require("react-native").View;
    return <MockView>{children}</MockView>;
  }
}));

jest.mock("@/api/commercialFeed", () => ({
  listCommercialFeedCampaigns: jest.fn(async () => ({ items: [] }))
}));
jest.mock("@/api/marketplace", () => ({
  searchContent: jest.fn(async () => [])
}));
jest.mock("@/api/storefront", () => ({
  searchPublicStorefronts: jest.fn(async () => [])
}));
jest.mock("@/api/courses", () => ({
  listCourses: jest.fn(async () => []),
  searchCourses: jest.fn(async () => [])
}));
jest.mock("@/api/videos", () => ({
  searchVideos: (...args: any[]) => mockSearchVideos(...args)
}));

import DiscoverDirectory from "@/app/discover";

describe("Discover video search", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSearchVideos.mockReset();
    mockSearchVideos.mockResolvedValue([
      {
        id: "video-1",
        title: "Tomato training",
        description: "Pruning and trellising",
        visibility: "public",
        owner: { displayName: "Garden Member" },
        mediaSource: {}
      }
    ]);
  });

  it("shows accessible videos as a first-class Discover section", async () => {
    render(<DiscoverDirectory />);

    await waitFor(() => {
      expect(screen.getByText("Tomato training")).toBeTruthy();
    });
    expect(screen.getByText("Videos")).toBeTruthy();
    expect(mockSearchVideos).toHaveBeenCalledWith({
      q: undefined,
      sort: "new",
      limit: 18
    });

    fireEvent.press(screen.getByLabelText("Open Tomato training"));
    expect(mockPush).toHaveBeenCalledWith("/videos/video-1");
  });
});
