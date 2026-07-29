import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityGrowDetailRoute from "@/app/home/facility/grows/[id]";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace, back: mockBack };

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: "grow-1" })
}));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));
jest.mock("@/hooks/useApiErrorHandler", () => {
  const clearError = jest.fn();
  const handleApiError = jest.fn();
  return { useApiErrorHandler: () => ({ error: null, clearError, handleApiError }) };
});
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});
jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));
jest.mock("@/components/facility/FacilityContextualTools", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "Contextual grow tools");
});

describe("FacilityGrowDetailRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockResolvedValue({
      grow: {
        id: "grow-1",
        name: "Summer crop",
        roomId: "room-1",
        roomName: "Flower room",
        stage: "Flower",
        status: "Active",
        plantCount: 24
      }
    });
  });

  it("presents one grow workspace and passes context into downstream workflows", async () => {
    const screen = render(<FacilityGrowDetailRoute />);

    await waitFor(() => expect(screen.getByText(/Summer crop/)).toBeTruthy());
    expect(screen.getByText("Contextual grow tools")).toBeTruthy();
    expect(screen.queryByText(/\{\s*"/)).toBeNull();

    fireEvent.press(screen.getByText("Tasks & calendar"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/tasks",
      params: { growId: "grow-1", roomId: "room-1", contextName: "Summer crop" }
    });
  });
});
