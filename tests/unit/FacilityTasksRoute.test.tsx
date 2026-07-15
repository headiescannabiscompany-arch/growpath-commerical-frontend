import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityTasksRoute from "@/app/home/facility/(tabs)/tasks";

const mockCreateTask = jest.fn();
const mockGetFacilityTasks = jest.fn();
const mockListTeamMembers = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockClearError = jest.fn();
const mockHandleApiError = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };

function addDaysKey(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({})
}));

jest.mock("@/api/tasks", () => ({
  createTask: (...args: any[]) => mockCreateTask(...args),
  getFacilityTasks: (...args: any[]) => mockGetFacilityTasks(...args)
}));

jest.mock("@/api/team", () => ({
  listTeamMembers: (...args: any[]) => mockListTeamMembers(...args)
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
    clearError: mockClearError,
    handleApiError: mockHandleApiError
  })
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/features/facility/useFacilityRooms", () => ({
  useFacilityRooms: () => ({
    rooms: [
      { id: "clone-room", name: "Clone room" },
      { id: "media-room", name: "Media room" },
      { id: "training-room", name: "Training room" }
    ],
    loading: false,
    error: null
  })
}));

jest.mock("@/features/facility/useFacilityGrows", () => ({
  useFacilityGrows: () => ({ grows: [], loading: false, error: null })
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
      },
      {
        id: "task-linked-batch",
        title: "Review production batch",
        dueDate: "2026-07-09",
        status: "OPEN",
        sourceType: "product_batch",
        linkedProductBatchId: "batch-linked-1",
        linkedRoomId: "mix-room"
      },
      {
        id: "task-linked-sensor-alert",
        title: "Inspect linked sensor alert",
        dueDate: "2026-07-10",
        status: "OPEN",
        sourceType: "sensor_alert",
        linkedSensorAlertId: "sensor-alert-linked-1",
        linkedRoomId: "flower-2"
      },
      {
        id: "task-linked-campaign",
        title: "Prepare facility outreach campaign",
        dueDate: "2026-07-11",
        status: "OPEN",
        sourceType: "feed_campaign",
        linkedFeedCampaignId: "campaign-linked-1"
      }
    ]);
    mockListTeamMembers.mockResolvedValue([
      { id: "member-1", userId: "user-1", name: "Alex Grower", role: "STAFF" }
    ]);
    mockCreateTask.mockResolvedValue({ id: "task-created" });
  });

  it("creates source-linked facility tasks with room, proof, and approval context", async () => {
    const screen = render(<FacilityTasksRoute />);

    await waitFor(() => expect(screen.getByText("Scout Flower Room")).toBeTruthy());
    expect(screen.getByText(/Source: sensor alert alert-1/)).toBeTruthy();
    expect(screen.getByText(/Room: flower-1/)).toBeTruthy();
    expect(screen.getByText("Review production batch")).toBeTruthy();
    expect(screen.getByText(/Source: product batch batch-linked-1/)).toBeTruthy();
    expect(screen.getByText(/Room: mix-room/)).toBeTruthy();
    expect(screen.getByText("Inspect linked sensor alert")).toBeTruthy();
    expect(screen.getByText(/Source: sensor alert sensor-alert-linked-1/)).toBeTruthy();
    expect(screen.getByText(/Room: flower-2/)).toBeTruthy();
    expect(screen.getByText("Prepare facility outreach campaign")).toBeTruthy();
    expect(screen.getByText(/Source: feed campaign campaign-linked-1/)).toBeTruthy();
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
    fireEvent.press(screen.getByLabelText("Facility task quick date In 7 days"));
    fireEvent.press(
      screen.getByLabelText("Facility task reminder preset 24 hours before")
    );
    fireEvent.press(screen.getByLabelText("Facility task recurrence preset weekly"));
    fireEvent.press(screen.getByLabelText("Assign facility task to Alex Grower"));
    fireEvent.press(screen.getByLabelText("Set facility task room Clone room"));
    fireEvent.press(screen.getByLabelText("Toggle advanced facility task linkage"));
    fireEvent.press(screen.getByLabelText("Set facility task source sop"));
    fireEvent.changeText(screen.getByLabelText("Facility task source object"), "sop-7");
    fireEvent.press(screen.getByLabelText("Toggle proof required"));
    fireEvent.press(screen.getByLabelText("Toggle approval required"));
    fireEvent.press(screen.getByLabelText("Create facility task"));

    await waitFor(() =>
      expect(mockCreateTask).toHaveBeenCalledWith("facility-1", {
        title: "Sanitize clone trays",
        notes: "After clone pull.",
        dueDate: addDaysKey(7),
        assignedToUserId: "user-1",
        sourceType: "sop",
        sourceObjectId: "sop-7",
        roomId: "clone-room",
        growId: undefined,
        allDay: true,
        calendarType: "sop_facility_task",
        sourceStage: "sop_work",
        linkedSopId: "sop-7",
        linkedRoomId: "clone-room",
        reminderPlan: { label: "24 hours before", channels: ["in_app"] },
        recurrence: { rule: "weekly" },
        requiresProof: true,
        requiresApproval: true,
        scope: "facility"
      })
    );
  });

  it("creates facility tasks linked to feed campaigns", async () => {
    const screen = render(<FacilityTasksRoute />);

    await waitFor(() => expect(screen.getByText("Scout Flower Room")).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Facility task title"),
      "Publish facility outreach"
    );
    fireEvent.press(screen.getByLabelText("Set facility task room Media room"));
    fireEvent.press(screen.getByLabelText("Toggle advanced facility task linkage"));
    fireEvent.press(screen.getByLabelText("Set facility task source feed_campaign"));
    fireEvent.changeText(
      screen.getByLabelText("Facility task source object"),
      "campaign-7"
    );
    fireEvent.press(screen.getByLabelText("Create facility task"));

    await waitFor(() =>
      expect(mockCreateTask).toHaveBeenCalledWith(
        "facility-1",
        expect.objectContaining({
          title: "Publish facility outreach",
          sourceType: "feed_campaign",
          sourceObjectId: "campaign-7",
          allDay: true,
          calendarType: "feed_campaign_facility_task",
          sourceStage: "facility_outreach_review",
          linkedFeedCampaignId: "campaign-7",
          linkedRoomId: "media-room",
          scope: "facility"
        })
      )
    );
  });

  it("creates facility tasks linked to course assignments", async () => {
    const screen = render(<FacilityTasksRoute />);

    await waitFor(() => expect(screen.getByText("Scout Flower Room")).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Facility task title"),
      "Review SOP assignment"
    );
    fireEvent.press(screen.getByLabelText("Set facility task room Training room"));
    fireEvent.press(screen.getByLabelText("Toggle advanced facility task linkage"));
    fireEvent.press(screen.getByLabelText("Set facility task source course_assignment"));
    fireEvent.changeText(
      screen.getByLabelText("Facility task source object"),
      "assignment-7"
    );
    fireEvent.press(screen.getByLabelText("Create facility task"));

    await waitFor(() =>
      expect(mockCreateTask).toHaveBeenCalledWith(
        "facility-1",
        expect.objectContaining({
          title: "Review SOP assignment",
          sourceType: "course_assignment",
          sourceObjectId: "assignment-7",
          allDay: true,
          calendarType: "course_assignment_facility_task",
          sourceStage: "training_assignment_review",
          linkedCourseAssignmentId: "assignment-7",
          linkedRoomId: "training-room",
          scope: "facility"
        })
      )
    );
  });
});
