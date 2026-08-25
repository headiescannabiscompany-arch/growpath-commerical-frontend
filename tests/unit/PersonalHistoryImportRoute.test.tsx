import React from "react";
import { render } from "@testing-library/react-native";

import PersonalHistoryImportRoute from "@/app/home/personal/(tabs)/tools/history-import";

let mockParams: Record<string, string> = {};
const mockImporter = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams
}));
jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children }: any) => children
}));
jest.mock("@/app/home/personal/(tabs)/tools/dew-point-guard", () => {
  const { Text } = require("react-native");
  return function MockImporter(props: any) {
    mockImporter(props);
    return <Text>History importer ready</Text>;
  };
});

describe("Personal history import route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it("requires an owned grow before opening the importer", () => {
    const screen = render(<PersonalHistoryImportRoute />);
    expect(
      screen.getByText(/Controller history must attach to one of your grows\./)
    ).toBeTruthy();
    expect(screen.queryByText("History importer ready")).toBeNull();
  });

  it("reuses the reviewed importer with Personal grow context", () => {
    mockParams = {
      growId: "grow-1",
      growName: "Tomato Patio Grow",
      roomId: "space-1",
      roomName: "Patio"
    };
    const screen = render(<PersonalHistoryImportRoute />);

    expect(screen.getByText("History importer ready")).toBeTruthy();
    expect(mockImporter).toHaveBeenCalledWith({
      historyImportMode: true,
      workspaceType: "personal",
      growLabel: "Tomato Patio Grow",
      initialRoomId: "space-1",
      initialRoomName: "Patio"
    });
  });
});
