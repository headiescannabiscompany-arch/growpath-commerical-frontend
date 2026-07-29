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

jest.mock("@/components/home/PersonalFeaturedFeed", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "Featured feed mock");
});

describe("PersonalGrowsRoute", () => {
  beforeEach(() => {
    mockListPersonalGrows.mockReset();
    mockPush.mockReset();
    mockListPersonalGrows.mockResolvedValue([]);
  });

  it("shows the featured feed above the empty grows state", async () => {
    const screen = render(<PersonalGrowsRoute />);

    await waitFor(() => expect(screen.getByText("Featured feed mock")).toBeTruthy());

    expect(screen.getByText("Personal grow workspace")).toBeTruthy();
    expect(screen.getByText("Grows")).toBeTruthy();
    expect(screen.getByText("Workspace summary")).toBeTruthy();
    expect(screen.getByText("No grow yet")).toBeTruthy();
    expect(screen.getByText("Featured feed mock")).toBeTruthy();
  });
});
