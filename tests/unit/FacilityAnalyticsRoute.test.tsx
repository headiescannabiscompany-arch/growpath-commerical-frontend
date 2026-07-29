import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import FacilityAnalyticsRoute from "@/app/home/facility/(tabs)/analytics";
import { fetchFacilityAnalyticsOverview } from "@/api/facilityAnalytics";

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/api/facilityAnalytics", () => ({
  fetchFacilityAnalyticsOverview: jest.fn()
}));

describe("FacilityAnalyticsRoute", () => {
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
    expect(screen.getByText("1 rooms unknown")).toBeTruthy();
    expect(screen.getByText("SOP compliance")).toBeTruthy();
    expect(screen.getByText("Sensor alerts")).toBeTruthy();
    expect(screen.getByText("Active batches")).toBeTruthy();
    expect(screen.getByText("Training completion")).toBeTruthy();
  });
});
