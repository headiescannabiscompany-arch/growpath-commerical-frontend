import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";

import FacilityLogDetailRoute from "@/app/home/facility/logs/[id]";
import FacilityPlantDetailRoute from "@/app/home/facility/plants/[id]";

const mockApiRequest = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: "record-1" })
}));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));
jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({
    error: null,
    clearError: jest.fn(),
    handleApiError: jest.fn()
  })
}));
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
  return () => React.createElement(Text, null, "Contextual plant tools");
});

describe("facility plant and journal detail routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("announces plant loading and presents the loaded plant record", async () => {
    let finishLoad: ((value: unknown) => void) | undefined;
    mockApiRequest.mockImplementation(
      () => new Promise((resolve) => (finishLoad = resolve))
    );
    const screen = render(<FacilityPlantDetailRoute />);

    expect(screen.getByLabelText("Loading facility plant details").props).toMatchObject({
      accessibilityRole: "progressbar"
    });
    await act(async () => {
      finishLoad?.({ plant: { id: "record-1", name: "Plant 12", stage: "Flower" } });
    });
    await waitFor(() =>
      expect(screen.getAllByText("Plant 12").length).toBeGreaterThan(0)
    );
    expect(screen.getByText("Contextual plant tools")).toBeTruthy();
  });

  it("announces journal loading and presents the loaded journal entry", async () => {
    let finishLoad: ((value: unknown) => void) | undefined;
    mockApiRequest.mockImplementation(
      () => new Promise((resolve) => (finishLoad = resolve))
    );
    const screen = render(<FacilityLogDetailRoute />);

    expect(screen.getByLabelText("Loading facility journal entry").props).toMatchObject({
      accessibilityRole: "progressbar"
    });
    await act(async () => {
      finishLoad?.({
        id: "record-1",
        title: "Canopy check",
        notes: "No action needed"
      });
    });
    await waitFor(() =>
      expect(screen.getAllByText("Canopy check").length).toBeGreaterThan(0)
    );
    expect(screen.getByText("No action needed")).toBeTruthy();
  });
});
