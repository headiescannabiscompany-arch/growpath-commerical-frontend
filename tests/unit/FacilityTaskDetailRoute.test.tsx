import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityTaskDetail from "@/app/home/facility/tasks/[id]";

const mockCompleteFacilityTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockGetTask = jest.fn();
const mockListTeamMembers = jest.fn();
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

jest.mock("@/api/team", () => ({
  listTeamMembers: (...args: any[]) => mockListTeamMembers(...args)
}));

jest.mock("@/features/facility/useFacilityRooms", () => ({
  useFacilityRooms: () => ({
    rooms: [
      { id: "flower-1", name: "Flower Room" },
      { id: "veg-1", name: "Veg Room" },
      { id: "media-room", name: "Media Room" }
    ],
    loading: false,
    error: null
  })
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
    mockListTeamMembers.mockResolvedValue([
      {
        id: "membership-1",
        userId: "user-1",
        role: "OWNER",
        name: "Facility Owner"
      },
      {
        id: "membership-2",
        userId: "user-2",
        role: "MANAGER",
        name: "Facility Manager"
      }
    ]);
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
    expect(
      screen.getByText("Source: Sensor Alert · Linked record available")
    ).toBeTruthy();
    expect(screen.getByText("Room: Flower Room")).toBeTruthy();
    expect(screen.getByText("Assigned to: Facility Owner")).toBeTruthy();
    expect(screen.queryByText("Task Details")).toBeNull();
    expect(screen.getAllByText(/Proof required/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Approval required/).length).toBeGreaterThan(0);

    fireEvent.press(screen.getByLabelText("Set task detail source sop"));
    fireEvent.press(screen.getByLabelText("Toggle advanced task linkage"));
    fireEvent.changeText(screen.getByLabelText("Task detail source object"), "sop-7");
    fireEvent.press(screen.getByLabelText("Set task detail room Veg Room"));
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

  it("assigns facility tasks through named team choices", async () => {
    const screen = render(<FacilityTaskDetail />);

    await waitFor(() =>
      expect(screen.getByText("Facility Manager · manager")).toBeTruthy()
    );

    expect(screen.queryByPlaceholderText("user id")).toBeNull();
    fireEvent.press(screen.getByLabelText("Assign facility task to Facility Manager"));
    fireEvent.press(screen.getByLabelText("Save task assignment"));

    await waitFor(() =>
      expect(mockUpdateTask).toHaveBeenCalledWith("facility-1", "task-1", {
        assignedTo: "user-2",
        assignedToUserId: "user-2"
      })
    );
  });

  it("opens alert-backed facility task sources in the shared alert center", async () => {
    taskOverrides = {
      linkedProductId: "input-1"
    };
    const screen = render(<FacilityTaskDetail />);

    await waitFor(() => expect(screen.getByText("IPM scout")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("View facility task source"));

    expect(mockPush).toHaveBeenCalledWith("/home/alerts?alertId=alert-1");

    fireEvent.press(screen.getByLabelText("View facility task linked object"));

    expect(mockPush).toHaveBeenCalledWith("/home/facility/inventory/input-1");
  });

  it("does not duplicate linked object action when facility source already opens it", async () => {
    taskOverrides = {
      sourceType: "product",
      sourceObjectId: "input-1",
      linkedProductId: "input-1"
    };
    const screen = render(<FacilityTaskDetail />);

    await waitFor(() => expect(screen.getByText("IPM scout")).toBeTruthy());

    expect(screen.queryByLabelText("View facility task linked object")).toBeNull();
  });

  it("opens linked-only sensor alert facility task sources in the shared alert center", async () => {
    taskOverrides = {
      sourceType: "sensor_alert",
      sourceObjectId: "",
      sourceId: "",
      linkedSensorAlertId: "sensor-alert-linked-1"
    };
    const screen = render(<FacilityTaskDetail />);

    await waitFor(() => expect(screen.getByText("IPM scout")).toBeTruthy());
    expect(
      screen.getByText("Source: Sensor Alert · Linked record available")
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("View facility task source"));

    expect(mockPush).toHaveBeenCalledWith("/home/alerts?alertId=sensor-alert-linked-1");
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
    expect(screen.getByText("Source: Forum · Linked record available")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("View facility task source"));

    expect(mockPush).toHaveBeenCalledWith("/forum/post?id=thread-facility");
  });

  it("opens course-assignment-backed facility task sources in the SOP workflow", async () => {
    taskOverrides = {
      sourceType: "course_assignment",
      sourceObjectId: "assignment-1",
      linkedCourseId: "course-1",
      linkedLessonId: "lesson-1",
      linkedCourseAssignmentId: "assignment-1"
    };
    const screen = render(<FacilityTaskDetail />);

    await waitFor(() => expect(screen.getByText("IPM scout")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("View facility task source"));

    expect(mockPush).toHaveBeenCalledWith(
      "/home/facility/sop-runs/course-1?lessonId=lesson-1&assignmentId=assignment-1"
    );
  });

  it("keeps linked-only course task source ids ahead of room context", async () => {
    taskOverrides = {
      sourceType: "course",
      sourceObjectId: "",
      sourceId: "",
      linkedCourseId: "course-linked-1",
      linkedRoomId: "room-linked-1"
    };
    const screen = render(<FacilityTaskDetail />);

    await waitFor(() => expect(screen.getByText("IPM scout")).toBeTruthy());
    expect(screen.getByText("Source: Course · Linked record available")).toBeTruthy();
    expect(screen.getByText("Room: Linked room")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("View facility task source"));

    expect(mockPush).toHaveBeenCalledWith("/home/facility/sop-runs/course-linked-1");
  });

  it.each([
    ["room", "flower-1", "/home/facility/rooms?roomId=flower-1"],
    ["course", "course-1", "/home/facility/sop-runs/course-1"],
    ["lesson", "lesson-1", "/home/facility/sop-runs/lesson-1"],
    ["sop", "sop-7", "/home/facility/sop-runs/sop-7"],
    ["live", "live-1", "/live-session?sessionId=live-1"],
    ["feed_campaign", "campaign-1", "/home/facility/feed?campaignId=campaign-1"],
    ["product", "input-1", "/home/facility/inventory/input-1"],
    ["product_batch", "batch-1", "/home/facility/inventory/batch-1"],
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

  it("saves facility task workflow context with feed campaign links", async () => {
    const screen = render(<FacilityTaskDetail />);

    await waitFor(() => expect(screen.getByText("IPM scout")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Set task detail source feed_campaign"));
    fireEvent.press(screen.getByLabelText("Toggle advanced task linkage"));
    fireEvent.changeText(
      screen.getByLabelText("Task detail source object"),
      "campaign-7"
    );
    fireEvent.press(screen.getByLabelText("Set task detail room Media Room"));
    fireEvent.press(screen.getByLabelText("Save task workflow context"));

    await waitFor(() =>
      expect(mockUpdateTask).toHaveBeenCalledWith(
        "facility-1",
        "task-1",
        expect.objectContaining({
          sourceType: "feed_campaign",
          sourceObjectId: "campaign-7",
          roomId: "media-room",
          linkedFeedCampaignId: "campaign-7",
          linkedRoomId: "media-room"
        })
      )
    );
  });
});
