import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import GrowTimelineShare from "@/features/grows/screens/GrowTimelineShare";

const mockGetGrow = jest.fn();
const mockGetTimeline = jest.fn();
const mockGetCurrent = jest.fn();
const mockPreview = jest.fn();
const mockPublish = jest.fn();
const mockWithdraw = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1" }),
  useRouter: () => ({ back: mockBack, push: mockPush })
}));

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: any) => React.useEffect(() => callback(), [callback])
  };
});

jest.mock("@/features/grows/workspaceData", () => ({
  getWorkspaceGrow: (...args: any[]) => mockGetGrow(...args),
  getWorkspaceGrowTimeline: (...args: any[]) => mockGetTimeline(...args)
}));

jest.mock("@/api/growTimelineCopies", () => ({
  getCurrentGrowTimelineCopy: (...args: any[]) => mockGetCurrent(...args),
  previewGrowTimelineCopy: (...args: any[]) => mockPreview(...args),
  publishGrowTimelineCopy: (...args: any[]) => mockPublish(...args),
  withdrawGrowTimelineCopy: (...args: any[]) => mockWithdraw(...args)
}));

jest.mock("@/utils/publicLinks", () => ({ sharePublicLink: jest.fn() }));

const events = [
  {
    id: "GrowLog:log-1",
    type: "log_created",
    title: "Week one note",
    summary: "Healthy growth",
    timestamp: "2026-08-01T12:00:00.000Z",
    payload: {}
  },
  {
    id: "GrowLog:log-2:photo:0",
    type: "photo_added",
    title: "Week two photo",
    summary:
      "https://api.growpathai.com/api/evidence-assets/uploads/507f1f77bcf86cd799439011/object",
    timestamp: "2026-08-08T12:00:00.000Z",
    payload: {
      photoUrl:
        "https://api.growpathai.com/api/evidence-assets/uploads/507f1f77bcf86cd799439011/object"
    }
  }
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGrow.mockResolvedValue({ id: "grow-1", name: "Tomato test" });
  mockGetTimeline.mockResolvedValue(events);
  mockGetCurrent.mockResolvedValue(null);
  mockPublish.mockResolvedValue({
    id: "copy-1",
    token: "A".repeat(43),
    version: 1,
    title: "Grow timeline: Tomato test",
    description: "",
    events: [],
    photos: [],
    status: "published",
    workspaceType: "personal"
  });
  mockPreview.mockResolvedValue({
    title: "Grow timeline: Tomato test",
    description: "Public summary",
    dateRange: {
      start: "2026-08-08T12:00:00.000Z",
      end: "2026-08-08T12:00:00.000Z"
    },
    events: [
      {
        type: "photo_added",
        title: "Week two photo",
        summary: "Photo selected for this grow timeline.",
        timestamp: "2026-08-08T12:00:00.000Z",
        tags: []
      }
    ],
    photoCount: 1,
    cannabisSpecific: false
  });
});

describe("GrowTimelineShare", () => {
  it("reviews selections and publishes only after the owner presses publish", async () => {
    const screen = render(<GrowTimelineShare workspace="personal" />);

    await waitFor(() =>
      expect(screen.getByLabelText("Remove Week one note")).toBeTruthy()
    );
    expect(mockPublish).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Remove Week one note"));
    fireEvent.changeText(
      screen.getByLabelText("Public timeline description"),
      "Public summary"
    );
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));

    await waitFor(() => expect(mockPreview).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Public timeline preview")).toBeTruthy();
    expect(screen.getByText("Photo selected for this grow timeline.")).toBeTruthy();
    expect(mockPublish).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Publish reviewed grow timeline"));

    await waitFor(() => expect(mockPublish).toHaveBeenCalledTimes(1));
    expect(mockPublish).toHaveBeenCalledWith(
      "personal",
      "grow-1",
      expect.objectContaining({
        title: "Grow timeline: Tomato test",
        description: "Public summary",
        eventIds: ["GrowLog:log-2:photo:0"],
        photoUrls: [
          "https://api.growpathai.com/api/evidence-assets/uploads/507f1f77bcf86cd799439011/object"
        ]
      })
    );
    expect(screen.getByText("Published version 1")).toBeTruthy();
  });

  it("cancels without publishing and withdraws without changing the private grow", async () => {
    mockGetCurrent.mockResolvedValue({
      id: "copy-1",
      token: "B".repeat(43),
      version: 2,
      title: "Existing copy",
      description: "",
      events: [],
      photos: [],
      status: "published",
      workspaceType: "commercial"
    });
    mockWithdraw.mockResolvedValue({ status: "withdrawn" });
    const screen = render(<GrowTimelineShare workspace="commercial" />);
    await waitFor(() => expect(screen.getByText("Published version 2")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Cancel public timeline review"));
    expect(mockBack).toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Withdraw published grow timeline"));
    await waitFor(() =>
      expect(mockWithdraw).toHaveBeenCalledWith("commercial", "grow-1")
    );
    expect(
      screen.getByText("The public link is withdrawn. Your private grow was not changed.")
    ).toBeTruthy();
  });
});
