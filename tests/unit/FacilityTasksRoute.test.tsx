import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityTasksRoute from "@/app/home/facility/(tabs)/tasks";

const mockCreateTask = jest.fn();
const mockGetFacilityTasks = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));

jest.mock("@/api/tasks", () => ({
  createTask: (...args: any[]) => mockCreateTask(...args),
  getFacilityTasks: (...args: any[]) => mockGetFacilityTasks(...args)
}));

jest.mock("@/components/InlineError", () => ({
  InlineError: () => null
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    facilityRole: "MANAGER",
    can: () => true
  })
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({
    error: null,
    clearError: jest.fn(),
    handleApiError: jest.fn()
  })
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

describe("FacilityTasksRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetFacilityTasks.mockResolvedValue([
      {
        id: "task-1",
        title: "Scout Flower Room",
        dueDate: "2026-07-08",
        status: "OPEN",
        sourceType: "sensor_alert",
        sourceObjectId: "alert-1",
        roomId: "flower-1",
        requiresProof: true,
        requiresApproval: true
      }
    ]);
    mockCreateTask.mockResolvedValue({ id: "task-created" });
  });

  it("creates source-linked facility tasks with room, proof, and approval context", async () => {
    const screen = render(<FacilityTasksRoute />);

    await waitFor(() => expect(screen.getByText("Scout Flower Room")).toBeTruthy());
    expect(screen.getByText(/Source: sensor alert alert-1/)).toBeTruthy();
    expect(screen.getByText(/Room: flower-1/)).toBeTruthy();
    expect(screen.getAllByText(/Proof required/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Approval required/).length).toBeGreaterThan(0);

    fireEvent.changeText(
      screen.getByLabelText("Facility task title"),
      "Sanitize clone trays"
    );
    fireEvent.changeText(
      screen.getByLabelText("Facility task notes"),
      "After clone pull."
    );
    fireEvent.changeText(screen.getByLabelText("Facility task due date"), "2026-07-09");
    fireEvent.changeText(screen.getByLabelText("Facility task assignee"), "user-1");
    fireEvent.press(screen.getByLabelText("Set facility task source sop"));
    fireEvent.changeText(screen.getByLabelText("Facility task source object"), "sop-7");
    fireEvent.changeText(screen.getByLabelText("Facility task room"), "clone-room");
    fireEvent.press(screen.getByLabelText("Toggle proof required"));
    fireEvent.press(screen.getByLabelText("Toggle approval required"));
    fireEvent.press(screen.getByLabelText("Create facility task"));

    await waitFor(() =>
      expect(mockCreateTask).toHaveBeenCalledWith("facility-1", {
        title: "Sanitize clone trays",
        notes: "After clone pull.",
        dueDate: "2026-07-09",
        assignedTo: "user-1",
        sourceType: "sop",
        sourceObjectId: "sop-7",
        roomId: "clone-room",
        requiresProof: true,
        requiresApproval: true,
        scope: "facility"
      })
    );
  });
});
