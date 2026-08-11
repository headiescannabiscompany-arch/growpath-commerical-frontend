import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityAnalyticsRoute, {
  createFacilityAnalyticsStyles
} from "@/app/home/facility/(tabs)/analytics";
import { fetchFacilityAnalyticsOverview } from "@/api/facilityAnalytics";
import { getThemePalette } from "@/theme/appTheme";

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };
let mockFacilityId: string | null = "facility-1";

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, header }: any) =>
    React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockFacilityId })
}));

jest.mock("@/api/facilityAnalytics", () => ({
  fetchFacilityAnalyticsOverview: jest.fn()
}));

describe("FacilityAnalyticsRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFacilityId = "facility-1";
  });

  it("uses the active Night palette for headings and metric text", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilityAnalyticsStyles(palette);

    expect(styles.title.color).toBe(palette.text);
    expect(styles.subtitle.color).toBe(palette.textMuted);
    expect(styles.metric.borderColor).toBe(palette.border);
    expect(styles.value.color).toBe(palette.text);
    expect(styles.label.color).toBe(palette.text);
    expect(styles.detail.color).toBe(palette.textMuted);
  });

  it("renders recorded facility analytics and unknown stability coverage", async () => {
    jest.mocked(fetchFacilityAnalyticsOverview).mockResolvedValue({
      roomStability: { stableRooms: 2, measuredRooms: 3, unknownRooms: 1 },
      taskCompletion: { total: 10, completed: 8, rate: 80 },
      sopCompliance: { applicableSteps: 20, completedSteps: 18, rate: 90 },
      sensorAlerts: { total: 4, recordedEvents: 120 },
      batches: { active: 3, completed: 7 },
      training: { staff: 6, assignments: 5, completedAssignments: 4, completionRate: 80 }
    });

    const screen = render(<FacilityAnalyticsRoute />);
    expect(screen.getByLabelText("Loading facility analytics").props).toMatchObject({
      accessibilityLiveRegion: "polite",
      accessibilityRole: "progressbar"
    });
    await waitFor(() => expect(screen.getByText("2/3")).toBeTruthy());
    expect(fetchFacilityAnalyticsOverview).toHaveBeenCalledWith("facility-1");
    expect(
      screen.getByRole("header", { name: "Facility Analytics" }).props["aria-level"]
    ).toBe(1);
    expect(screen.getByText("1 rooms unknown")).toBeTruthy();
    expect(
      screen.getByRole("header", { name: "SOP compliance" }).props["aria-level"]
    ).toBe(2);
    expect(screen.getByRole("header", { name: "Sensor alerts" })).toBeTruthy();
    expect(screen.getByRole("header", { name: "Active batches" })).toBeTruthy();
    expect(screen.getByRole("header", { name: "Training completion" })).toBeTruthy();
    expect(
      screen.getByLabelText("Refresh facility analytics").props.accessibilityState
    ).toMatchObject({ busy: false, disabled: false });
  });

  it("redirects to Facility selection instead of loading forever without context", () => {
    mockFacilityId = null;

    render(<FacilityAnalyticsRoute />);

    expect(mockReplace).toHaveBeenCalledWith("/home/facility/select");
    expect(fetchFacilityAnalyticsOverview).not.toHaveBeenCalled();
  });

  it("prevents duplicate analytics refresh requests while one is pending", async () => {
    jest.mocked(fetchFacilityAnalyticsOverview).mockResolvedValue({} as any);
    const screen = render(<FacilityAnalyticsRoute />);
    await waitFor(() =>
      expect(
        screen.getByLabelText("Refresh facility analytics").props.accessibilityState
      ).toMatchObject({ busy: false, disabled: false })
    );
    const callsBeforeRefresh = jest.mocked(fetchFacilityAnalyticsOverview).mock.calls
      .length;
    jest
      .mocked(fetchFacilityAnalyticsOverview)
      .mockImplementation(() => new Promise(() => {}));
    const refresh = screen.getByLabelText("Refresh facility analytics");

    fireEvent.press(refresh);
    fireEvent.press(refresh);

    expect(fetchFacilityAnalyticsOverview).toHaveBeenCalledTimes(callsBeforeRefresh + 1);
    expect(
      screen.getByLabelText("Refresh facility analytics").props.accessibilityState
    ).toMatchObject({ busy: true, disabled: true });
    screen.unmount();
  });
});
