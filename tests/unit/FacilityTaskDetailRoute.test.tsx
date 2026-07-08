import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityTaskDetail from "@/app/home/facility/tasks/[id]";

const mockCompleteFacilityTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockGetTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { back: mockBack, push: mockPush, replace: mockReplace };
const mockClearError = jest.fn();
const mockHandleApiError = jest.fn();
const mockEntitlements = {
  facilityRole: "OWNER",
  can: () => true
};
const mockFacilityState = { selectedId: "facility-1" };
let taskOverrides: Record<string, any> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "task-1" }),
  useRouter: () => mockRouter
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
  useEntitlements: () => mockEntitlements
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({
    error: null,
    clearError: mockClearError,
    handleApiError: mockHandleApiError
  })
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => mockFacilityState
}));

describe("FacilityTaskDetail", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    taskOverrides = {};
    mockGetTask.mockImplementation(() =>
      Promise.resolve({
        id: "task-1",
        title: "IPM scout",
        notes: "Check leaf undersides.",
        dueDate: "2026-07-09",
        sourceType: "sensor_alert",
        sourceObjectId: "alert-1",
        roomId: "flower-1",
        requiresProof: true,
        requiresApproval: true,
        assignedTo: "user-1",
        ...taskOverrides
      })
    );
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
        linkedSopId: "sop-7",
        linkedRoomId: "veg-1",
        requiresProof: false,
        requiresApproval: false
      })
    );
  });

  it("opens alert-backed facility task sources in the shared alert center", async () => {
    const screen = render(<FacilityTaskDetail />);

    await waitFor(() => expect(screen.getByText("IPM scout")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("View facility task source"));

    expect(mockPush).toHaveBeenCalledWith("/home/alerts");
  });

  it("opens forum-backed facility task sources in the shared forum route", async () => {
    taskOverrides = {
      sourceType: "forum",
      sourceObjectId: "",
      sourceId: "",
      linkedForumThreadId: "thread-facility"
    };
    const screen = render(<FacilityTaskDetail />);

    await waitFor(() => expect(screen.getByText("IPM scout")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("View facility task source"));

    expect(mockPush).toHaveBeenCalledWith("/forum/post/thread-facility");
  });

  it.each([
    ["room", "flower-1", "/home/facility/rooms?roomId=flower-1"],
    ["course", "course-1", "/home/facility/sop-runs"],
    ["lesson", "lesson-1", "/home/facility/sop-runs"],
    ["sop", "sop-7", "/home/facility/sop-runs/sop-7"],
    ["live", "live-1", "/feed?liveId=live-1"],
    ["product", "input-1", "/home/facility/inventory"],
    ["product_batch", "batch-1", "/home/facility/inventory"],
    ["product_trial", "run-1", "/home/facility/grows/run-1"]
  ])(
    "keeps %s-backed facility task sources out of commercial admin routes",
    async (sourceType, sourceObjectId, expectedRoute) => {
      taskOverrides = { sourceType, sourceObjectId };
      const screen = render(<FacilityTaskDetail />);

      await waitFor(() => expect(screen.getByText("IPM scout")).toBeTruthy());

      fireEvent.press(screen.getByLabelText("View facility task source"));

      expect(mockPush).toHaveBeenCalledWith(expectedRoute);
      expect(mockPush).not.toHaveBeenCalledWith(
        expect.stringContaining("/home/commercial")
      );
    }
  );
});
