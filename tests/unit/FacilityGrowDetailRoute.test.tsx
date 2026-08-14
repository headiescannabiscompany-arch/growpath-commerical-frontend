import React from "react";
import { RefreshControl } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

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
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { GROWS_WRITE: "GROWS_WRITE" },
  useEntitlements: () => ({ can: () => true })
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
jest.mock("@/components/integrations/GrowIntegrationBuildPanel", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "Grow integrations");
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

    await waitFor(() =>
      expect(screen.getAllByText(/Summer crop/).length).toBeGreaterThan(0)
    );
    expect(
      screen
        .getAllByText("Summer crop")
        .some(
          (node) =>
            node.props.accessibilityRole === "header" && node.props["aria-level"] === 1
        )
    ).toBe(true);
    expect(screen.getByText("Grow workspace").props).toMatchObject({
      accessibilityRole: "header",
      "aria-level": 2
    });
    expect(screen.getByText("Contextual grow tools")).toBeTruthy();
    expect(screen.queryByText(/\{\s*"/)).toBeNull();

    fireEvent.press(
      screen.getByRole("link", {
        name: "Open Tasks & calendar for Summer crop"
      })
    );

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/tasks",
      params: { growId: "grow-1", roomId: "room-1", contextName: "Summer crop" }
    });
  });

  it("names loading progress and serializes pull-to-refresh requests", async () => {
    const screen = render(<FacilityGrowDetailRoute />);

    expect(screen.getByLabelText("Loading facility grow details").props).toMatchObject({
      accessibilityRole: "progressbar"
    });
    await waitFor(() => expect(screen.getByText("Grow workspace")).toBeTruthy());

    let finishRefresh: ((value: unknown) => void) | undefined;
    mockApiRequest.mockImplementationOnce(
      () => new Promise((resolve) => (finishRefresh = resolve))
    );
    const refreshControl = screen.UNSAFE_getByType(RefreshControl);
    act(() => {
      refreshControl.props.onRefresh();
      refreshControl.props.onRefresh();
    });

    expect(mockApiRequest).toHaveBeenCalledTimes(2);
    await act(async () => {
      finishRefresh?.({ grow: { id: "grow-1", name: "Summer crop" } });
    });
  });

  it("lets an authorized Facility member add structured crop context", async () => {
    const screen = render(<FacilityGrowDetailRoute />);
    await waitFor(() => expect(screen.getByText("Crop context")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Select crop Cannabis"));
    mockApiRequest.mockResolvedValueOnce({
      grow: {
        id: "grow-1",
        name: "Summer crop",
        cropTypes: ["Cannabis"],
        growInterests: { crops: ["Cannabis"] }
      }
    });
    fireEvent.press(screen.getByLabelText("Save crop context"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenLastCalledWith(expect.stringContaining("grow-1"), {
        method: "PATCH",
        body: {
          cropTypes: ["Cannabis"],
          growInterests: { crops: ["Cannabis"] }
        }
      })
    );
    expect(
      await screen.findByText(
        "Saved. Harvest Readiness is now available in Facility AI Tools."
      )
    ).toBeTruthy();
  });
});
