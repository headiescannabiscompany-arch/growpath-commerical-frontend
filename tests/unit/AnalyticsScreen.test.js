import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import AnalyticsScreen from "@/screens/AnalyticsScreen";

const mockListPersonalGrows = jest.fn();
const mockListPersonalLogs = jest.fn();
const mockListPersonalPlants = jest.fn();
const mockListPersonalTasks = jest.fn();
const mockListToolRuns = jest.fn();
const mockUseEntitlements = jest.fn();

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
        createdAt: "2026-06-28T12:00:00.000Z"
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
      }
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders real personal analytics and attention rows", async () => {
    const screen = render(<AnalyticsScreen />);

    await waitFor(() => expect(screen.getByText("Flower Room")).toBeTruthy());

    expect(screen.getByText("personal mode | pro plan")).toBeTruthy();
    expect(screen.getByText("Last 7 Days")).toBeTruthy();
    expect(screen.getByText("Grow Activity")).toBeTruthy();
    expect(screen.getByText("1 logs")).toBeTruthy();
    expect(screen.getByText("dew point guard")).toBeTruthy();
    expect(screen.getByText("Water plant")).toBeTruthy();
    expect(screen.getByText("No journal entry in the last 10 days.")).toBeTruthy();
  });
});
