import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import FacilityAnalyticsRoute, {
  createFacilityAnalyticsStyles
} from "@/app/home/facility/(tabs)/analytics";
import { fetchFacilityAnalyticsOverview } from "@/api/facilityAnalytics";
import { getThemePalette } from "@/theme/appTheme";

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/api/facilityAnalytics", () => ({
  fetchFacilityAnalyticsOverview: jest.fn()
}));

describe("FacilityAnalyticsRoute", () => {
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
  });
});
