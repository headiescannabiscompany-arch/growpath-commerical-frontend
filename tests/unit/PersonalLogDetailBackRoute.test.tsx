import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import LogDetailScreen from "@/app/home/personal/(tabs)/logs/[logId]";

const mockGetPersonalLog = jest.fn();

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (effect: () => void) => {
      React.useEffect(() => {
        effect();
      }, [effect]);
    }
  };
});

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ logId: "log-1" }),
  useRouter: () => ({ replace: jest.fn() })
}));

jest.mock("@/api/logs", () => ({
  getPersonalLog: (...args: any[]) => mockGetPersonalLog(...args),
  updatePersonalLog: jest.fn(),
  deletePersonalLog: jest.fn()
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref, title }: any) =>
      React.createElement(
        View,
        { accessibilityLabel: `screen-${title}` },
        showBack
          ? React.createElement(Text, null, `Shared Back ${backFallbackHref}`)
          : null,
        children
      )
  };
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { accessibilityLabel: "personal-feed" });
});

describe("LogDetailScreen back behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPersonalLog.mockResolvedValue({
      id: "log-1",
      growId: "grow-1",
      title: "Watering note",
      date: "2026-07-08",
      type: "watering",
      notes: "Watered and checked runoff.",
      tags: []
    });
  });

  it("uses the shared back fallback to the linked grow journal", async () => {
    const screen = render(<LogDetailScreen />);

    await waitFor(() =>
      expect(
        screen.getByText("Shared Back /home/personal/grows/grow-1/journal")
      ).toBeTruthy()
    );
    expect(screen.getByText("Watering note")).toBeTruthy();
    expect(mockGetPersonalLog).toHaveBeenCalledWith("log-1");
  });
});
