import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import PersonalGrowsRoute from "@/app/home/personal/(tabs)/grows";

const mockListPersonalGrows = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    GROWS_PERSONAL_WRITE: "grows_personal_write"
  },
  useEntitlements: () => ({
    can: () => true,
    limits: { maxGrows: 10 }
  })
}));

jest.mock("@/api/grows", () => ({
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args)
}));

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, style }: any) => React.createElement(View, { style }, children);
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ placement, routeKey }: any) =>
    React.createElement(
      Text,
      { testID: `feed-${routeKey}-${placement}` },
      `${routeKey} ${placement} feed`
    );
});

describe("PersonalGrowsRoute", () => {
  beforeEach(() => {
    mockListPersonalGrows.mockReset();
    mockPush.mockReset();
    mockListPersonalGrows.mockResolvedValue([]);
  });

  it("uses the normal grows feed policy instead of the Home featured feed", async () => {
    const screen = render(<PersonalGrowsRoute />);

    await waitFor(() =>
      expect(screen.getByTestId("feed-personal_grows-top")).toBeTruthy()
    );

    expect(screen.getByText("Personal grow workspace")).toBeTruthy();
    expect(screen.getByText("Grows")).toBeTruthy();
    expect(screen.getByText("Grow roadmap")).toBeTruthy();
    expect(
      screen.getByText("Turn a blank workspace into a real grow record.")
    ).toBeTruthy();
    expect(screen.getAllByText("Create Grow").length).toBeGreaterThan(1);
    expect(screen.getByText("Workspace summary")).toBeTruthy();
    expect(screen.getByText("No grow yet")).toBeTruthy();
    expect(screen.getByTestId("feed-personal_grows-middle")).toBeTruthy();
    expect(screen.getByTestId("feed-personal_grows-bottom")).toBeTruthy();
    expect(screen.queryByText("Featured feed mock")).toBeNull();
  });

  it("shows a useful roadmap for the latest grow", async () => {
    mockListPersonalGrows.mockResolvedValue([
      {
        id: "grow-1",
        name: "Front Yard",
        cropCommonName: "Cannabis",
        scientificName: "Cannabis sativa",
        cultivar: "Blue Dream",
        location: "Greenhouse A",
        startDate: "2026-07-21T00:00:00Z",
        updatedAt: "2026-07-22T00:00:00Z",
        status: "flowering",
        photos: [{ id: "photo-1" }, { id: "photo-2" }]
      }
    ]);

    const screen = render(<PersonalGrowsRoute />);

    await waitFor(() =>
      expect(screen.getAllByText("Front Yard").length).toBeGreaterThan(0)
    );

    expect(screen.getByText("Grow roadmap")).toBeTruthy();
    expect(
      screen.getByText("Keep the current grow moving with a clear next step.")
    ).toBeTruthy();
    expect(
      screen.getAllByText("Cannabis • Cannabis sativa • Blue Dream").length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Greenhouse A/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open Grow").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Journal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Timeline").length).toBeGreaterThan(0);
  });
});
