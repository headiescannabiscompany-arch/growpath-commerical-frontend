import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import AnalyticsScreen from "@/screens/AnalyticsScreen";

const mockListPersonalGrows = jest.fn();
const mockListPersonalLogs = jest.fn();
const mockListPersonalPlants = jest.fn();
const mockListPersonalTasks = jest.fn();
const mockListToolRuns = jest.fn();
const mockUseEntitlements = jest.fn();
const mockFetchPersonalAnalyticsOverview = jest.fn();

jest.mock("@/api/grows", () => ({
  listPersonalGrows: (...args) => mockListPersonalGrows(...args)
}));

jest.mock("@/api/logs", () => ({
  listPersonalLogs: (...args) => mockListPersonalLogs(...args)
}));

jest.mock("@/api/plants", () => ({
  listPersonalPlants: (...args) => mockListPersonalPlants(...args)
}));

jest.mock("@/api/tasks", () => ({
  listPersonalTasks: (...args) => mockListPersonalTasks(...args)
}));

jest.mock("@/api/toolRuns", () => ({
  listToolRuns: (...args) => mockListToolRuns(...args)
}));

jest.mock("@/api/personalAnalytics", () => ({
  fetchPersonalAnalyticsOverview: (...args) => mockFetchPersonalAnalyticsOverview(...args)
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockUseEntitlements()
}));

describe("AnalyticsScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .spyOn(Date, "now")
      .mockReturnValue(new Date("2026-06-29T12:00:00.000Z").getTime());
    mockUseEntitlements.mockReturnValue({ mode: "personal", plan: "pro" });
    mockFetchPersonalAnalyticsOverview.mockResolvedValue({
      consistency: { rate: 50 },
      environmentHistory: { sourceCount: 1, pointCount: 24 },
      activity: { runComparisons: 1 },
      taskCompletion: { total: 2, completed: 1, rate: 50 }
    });
    mockListPersonalGrows.mockResolvedValue([
      {
        id: "grow-1",
        name: "Flower Room",
        status: "flowering",
        updatedAt: "2026-06-28T12:00:00.000Z"
      },
      {
        id: "grow-2",
        name: "Veg Tent",
        status: "vegetating",
        updatedAt: "2026-06-28T12:00:00.000Z"
      }
    ]);
    mockListPersonalLogs.mockResolvedValue([
      {
        id: "log-1",
        growId: "grow-1",
        title: "Checked canopy",
        date: "2026-06-28T12:00:00.000Z",
        createdAt: "2026-06-28T12:00:00.000Z",
        metrics: { temperatureF: 78, humidity: 58 }
      }
    ]);
    mockListPersonalPlants.mockResolvedValue([
      { id: "plant-1", growId: "grow-1", stage: "flower" },
      { id: "plant-2", growId: "grow-2", stage: "veg" }
    ]);
    mockListPersonalTasks.mockResolvedValue([
      {
        id: "task-1",
        growId: "grow-1",
        title: "Water plant",
        dueDate: "2026-06-27T12:00:00.000Z",
        completed: false
      },
      {
        id: "task-2",
        growId: "grow-2",
        title: "Check runoff",
        dueDate: "2026-07-01T12:00:00.000Z",
        completed: true
      }
    ]);
    mockListToolRuns.mockResolvedValue([
      {
        id: "run-1",
        growId: "grow-1",
        toolType: "dew-point-guard",
        createdAt: "2026-06-29T10:00:00.000Z"
      },
      {
        id: "run-2",
        growId: "grow-1",
        toolName: "run_comparison",
        createdAt: "2026-06-29T11:00:00.000Z"
      }
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders real personal analytics and attention rows", async () => {
    const screen = render(<AnalyticsScreen />);

    await waitFor(() => expect(screen.getByText("Flower Room")).toBeTruthy());

    expect(screen.getByRole("header", { name: "Grow Analytics" })).toBeTruthy();
    expect(screen.getByText("personal workspace · pro plan")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Last 7 Days" })).toBeTruthy();
    expect(screen.getByRole("header", { name: "Grow Activity" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Refresh grow analytics" })).toBeTruthy();
    expect(screen.getByLabelText("Grow consistency: 50%")).toBeTruthy();
    expect(screen.getByText("Grow consistency")).toBeTruthy();
    expect(screen.getByText("Environment records")).toBeTruthy();
    expect(screen.getByText("Run comparisons")).toBeTruthy();
    expect(screen.getByText("Measured History")).toBeTruthy();
    expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("24").length).toBeGreaterThan(0);
    expect(screen.getByText("1 logs")).toBeTruthy();
    expect(screen.getByText("dew point guard")).toBeTruthy();
    expect(screen.getByText("Water plant")).toBeTruthy();
    expect(screen.getByText("No journal entry in the last 10 days.")).toBeTruthy();
  });

  it("keeps record-backed analytics usable when the supplemental summary fails", async () => {
    mockFetchPersonalAnalyticsOverview.mockRejectedValueOnce(
      new Error("Summary temporarily unavailable")
    );
    const screen = render(<AnalyticsScreen />);

    await waitFor(() => expect(screen.getByText("Flower Room")).toBeTruthy());
    expect(
      screen.getByText(/server summary is unavailable.*loaded records/i)
    ).toBeTruthy();
    expect(screen.getByLabelText("Active grows: 2")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Refresh grow analytics" }));
    await waitFor(() =>
      expect(mockFetchPersonalAnalyticsOverview).toHaveBeenCalledTimes(2)
    );
  });
});
