import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityIntegrationsRoute, {
  createFacilityIntegrationsStyles
} from "@/app/home/facility/(tabs)/integrations";
import { getThemePalette } from "@/theme/appTheme";

jest.setTimeout(20000);

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockBuildPanel = jest.fn();
let mockFacilityRole = "OWNER";
let mockSelectedFacilityId = "facility-1";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));
jest.mock("@/api/endpoints", () => ({
  endpoints: { grows: (facilityId: string) => `/api/facilities/${facilityId}/grows` }
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    facilityRole: mockFacilityRole,
    selectedFacilityId: mockSelectedFacilityId
  })
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockSelectedFacilityId })
}));
jest.mock("@/components/integrations/GrowIntegrationBuildPanel", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockGrowIntegrationBuildPanel(props: any) {
    mockBuildPanel(props);
    return React.createElement(
      Text,
      { testID: "facility-grow-integration-panel" },
      "Grow integration panel"
    );
  };
});
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

describe("FacilityIntegrationsRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFacilityRole = "OWNER";
    mockSelectedFacilityId = "facility-1";
    mockApiRequest.mockResolvedValue({
      grows: [
        { id: "grow-1", name: "Flower Cycle 12", roomName: "Flower A" },
        { id: "grow-2", name: "Mother Room" }
      ]
    });
  });

  it("uses the active Night palette for its page, cards, and controls", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilityIntegrationsStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.providerChoice.backgroundColor).toBe(palette.surface);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.primaryAction.backgroundColor).toBe(palette.accent);
  });

  it("does not let a Viewer open either integration write flow", async () => {
    mockFacilityRole = "VIEWER";
    const screen = render(<FacilityIntegrationsRoute />);

    const pulseAction = screen.getByLabelText("Connect Facility Pulse");
    const historyAction = screen.getByLabelText("Import Facility grow history");
    expect(pulseAction).toBeDisabled();
    expect(historyAction).toBeDisabled();
    fireEvent.press(historyAction);
    expect(mockPush).not.toHaveBeenCalled();
    await waitFor(() => expect(mockApiRequest).toHaveBeenCalled());
  });

  it("states provider readiness without claiming unfinished adapters are live", async () => {
    const screen = render(<FacilityIntegrationsRoute />);

    expect(screen.getByText("Read-only setup available")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Select trolmaster integration"));
    expect(screen.getByText("Key storage only · API access required")).toBeTruthy();
    expect(screen.getByText(/after its read-only adapter is implemented/)).toBeTruthy();
    expect(screen.getByText("Available · review required")).toBeTruthy();
    expect(screen.queryByText("UbiBot")).toBeNull();
    expect(screen.queryByText("ZENTRA Cloud")).toBeNull();
    await waitFor(() => expect(mockApiRequest).toHaveBeenCalled());
  });

  it("never uses a Facility id as the grow target and requires an explicit grow", async () => {
    const screen = render(<FacilityIntegrationsRoute />);

    expect(screen.queryByTestId("facility-grow-integration-panel")).toBeNull();
    expect(screen.getByText(/No grow selected/)).toBeTruthy();
    expect(mockBuildPanel).not.toHaveBeenCalled();

    await waitFor(() => expect(screen.getByText("Flower Cycle 12")).toBeTruthy());
    fireEvent.press(
      screen.getByLabelText("Use Flower Cycle 12 for Facility integrations")
    );

    await waitFor(() =>
      expect(mockBuildPanel).toHaveBeenLastCalledWith(
        expect.objectContaining({
          mode: "facility",
          targetRef: "grow-1",
          facilityId: "facility-1",
          canConfigure: true
        })
      )
    );
    expect(mockBuildPanel).not.toHaveBeenCalledWith(
      expect.objectContaining({ targetRef: "facility-1" })
    );
    expect(screen.getByText("Destination: Flower Cycle 12")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Import Facility grow history"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/tools/history-import",
      params: {
        growId: "grow-1",
        growName: "Flower Cycle 12",
        roomId: "",
        roomName: "Flower A"
      }
    });
  });
});
