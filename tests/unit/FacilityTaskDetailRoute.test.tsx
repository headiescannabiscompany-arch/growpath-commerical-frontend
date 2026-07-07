import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityTaskDetail from "@/app/home/facility/tasks/[id]";

const mockCompleteFacilityTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockGetTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "task-1" }),
  useRouter: () => ({ back: mockBack, replace: mockReplace })
}));

jest.mock("@/api/tasks", () => ({
  completeFacilityTask: (...args: any[]) => mockCompleteFacilityTask(...args),
  deleteTask: (...args: any[]) => mockDeleteTask(...args),
  getTask: (...args: any[]) => mockGetTask(...args),
  updateTask: (...args: any[]) => mockUpdateTask(...args)
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
  CAPABILITY_KEYS: { TASKS_WRITE: "tasks_write" },
  useEntitlements: () => ({
    facilityRole: "OWNER",
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

describe("FacilityTaskDetail", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetTask.mockResolvedValue({
      id: "task-1",
      title: "IPM scout",
      notes: "Check leaf undersides.",
      dueDate: "2026-07-09",
      sourceType: "sensor_alert",
      sourceObjectId: "alert-1",
      roomId: "flower-1",
      requiresProof: true,
      requiresApproval: true,
      assignedTo: "user-1"
    });
    mockUpdateTask.mockResolvedValue({
      id: "task-1",
      title: "IPM scout",
      sourceType: "sop",
      sourceObjectId: "sop-7",
      roomId: "veg-1",
      requiresProof: false,
      requiresApproval: false
    });
  });

  it("shows and patches facility task workflow context", async () => {
    const screen = render(<FacilityTaskDetail />);

    await waitFor(() => expect(screen.getByText("IPM scout")).toBeTruthy());
    expect(screen.getByText(/Sensor Alert alert-1/)).toBeTruthy();
    expect(screen.getByText(/Room: flower-1/)).toBeTruthy();
    expect(screen.getAllByText(/Proof required/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Approval required/).length).toBeGreaterThan(0);

    fireEvent.press(screen.getByLabelText("Set task detail source sop"));
    fireEvent.changeText(screen.getByLabelText("Task detail source object"), "sop-7");
    fireEvent.changeText(screen.getByLabelText("Task detail room"), "veg-1");
    fireEvent.press(screen.getByLabelText("Toggle task detail proof required"));
    fireEvent.press(screen.getByLabelText("Toggle task detail approval required"));
    fireEvent.press(screen.getByLabelText("Save task workflow context"));

    await waitFor(() =>
      expect(mockUpdateTask).toHaveBeenCalledWith("facility-1", "task-1", {
        sourceType: "sop",
        sourceObjectId: "sop-7",
        roomId: "veg-1",
        requiresProof: false,
        requiresApproval: false
      })
    );
  });
});
