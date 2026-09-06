import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import GrowTimelineShare from "@/features/grows/screens/GrowTimelineShare";

const mockGetGrow = jest.fn();
const mockGetTimeline = jest.fn();
const mockGetCurrent = jest.fn();
const mockPreview = jest.fn();
const mockPublish = jest.fn();
const mockWithdraw = jest.fn();
const mockCreateForumPost = jest.fn();
const mockPublicShareActions = jest.fn((_props: any) => null);
const mockBack = jest.fn();
const mockPush = jest.fn();

function previewResult(presentation: "visual" | "list") {
  return {
    title: "Grow timeline: Tomato test",
    description: "Public summary",
    presentation,
    dateRange: {
      start: "2026-08-08T12:00:00.000Z",
      end: "2026-08-08T12:00:00.000Z"
    },
    events: [
      {
        id: "GrowLog:log-2:photo:0",
        type: "photo_added",
        title: "Week two photo",
        summary: "Photo selected for this grow timeline.",
        timestamp: "2026-08-08T12:00:00.000Z",
        tags: []
      }
    ],
    photoCount: 1,
    cannabisSpecific: false
  };
}

function publishedResult(presentation: "visual" | "list") {
  return {
    id: "copy-1",
    token: "A".repeat(43),
    version: 1,
    title: "Grow timeline: Tomato test",
    description: "",
    presentation,
    events: [],
    photos: [],
    status: "published",
    workspaceType: "personal"
  };
}

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

jest.mock("@/api/communitySocial", () => ({
  createForumPost: (...args: any[]) => mockCreateForumPost(...args)
}));

jest.mock(
  "@/components/sharing/PublicShareActions",
  () => (props: any) => mockPublicShareActions(props)
);

jest.mock("@/utils/publicLinks", () => ({
  sharePublicLink: jest.fn(),
  currentPublicUrl: (path: string) => `https://growpathai.com${path}`
}));

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
  mockPublish.mockResolvedValue(publishedResult("visual"));
  mockPreview.mockResolvedValue(previewResult("visual"));
  mockCreateForumPost.mockResolvedValue({ id: "post-1" });
});

describe("GrowTimelineShare", () => {
  it("reviews selections and publishes only after the owner presses publish", async () => {
    const screen = render(<GrowTimelineShare workspace="personal" />);

    await waitFor(() =>
      expect(screen.getByLabelText("Customize included timeline entries")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Customize included timeline entries"));
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
    expect(mockPreview).toHaveBeenCalledWith(
      "personal",
      "grow-1",
      expect.objectContaining({ presentation: "visual" })
    );
    expect(screen.getByLabelText("Public timeline preview")).toBeTruthy();
    expect(screen.getByLabelText("Visual grow timeline flowchart")).toBeTruthy();
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
        presentation: "visual",
        eventIds: ["GrowLog:log-2:photo:0"],
        photoUrls: [
          "https://api.growpathai.com/api/evidence-assets/uploads/507f1f77bcf86cd799439011/object"
        ]
      })
    );
    expect(screen.getByText("Published version 1")).toBeTruthy();
  });

  it("preserves list presentation through preview and publish", async () => {
    mockPreview.mockResolvedValue(previewResult("list"));
    mockPublish.mockResolvedValue(publishedResult("list"));
    const screen = render(<GrowTimelineShare workspace="personal" />);

    await waitFor(() =>
      expect(screen.getByLabelText("Review public grow timeline preview")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Vertical Detailed List"));
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));

    await waitFor(() => expect(mockPreview).toHaveBeenCalledTimes(1));
    expect(mockPreview).toHaveBeenCalledWith(
      "personal",
      "grow-1",
      expect.objectContaining({ presentation: "list" })
    );
    expect(screen.getByLabelText("Public timeline preview")).toBeTruthy();
    expect(screen.queryByLabelText("Visual grow timeline flowchart")).toBeNull();

    fireEvent.press(screen.getByLabelText("Publish reviewed grow timeline"));

    await waitFor(() => expect(mockPublish).toHaveBeenCalledTimes(1));
    expect(mockPublish).toHaveBeenCalledWith(
      "personal",
      "grow-1",
      expect.objectContaining({ presentation: "list" })
    );
  });

  it("keeps a deselected journal photo out of the exact visual preview", async () => {
    const firstPhoto = "/uploads/first-journal-photo.jpg";
    const privatePhoto = "/uploads/private-journal-photo.jpg";
    const pairedEvents = [
      {
        id: "GrowLog:paired-log",
        sourceId: "paired-log",
        sourceModel: "GrowLog",
        type: "log_created",
        title: "Paired journal entry",
        summary: "Only the selected photo should be shown.",
        timestamp: "2026-08-08T12:00:00.000Z",
        payload: { photos: [firstPhoto, privatePhoto] }
      },
      {
        id: "GrowLog:paired-log:photo:0",
        sourceId: "paired-log",
        sourceModel: "GrowLog",
        type: "photo_added",
        title: "Photo added",
        summary: "Photo selected for this grow timeline.",
        timestamp: "2026-08-08T12:00:00.000Z",
        payload: { linkedLogId: "paired-log", photoUrl: firstPhoto }
      }
    ];
    mockGetTimeline.mockResolvedValueOnce(pairedEvents);
    mockPreview.mockResolvedValueOnce({
      ...previewResult("visual"),
      events: pairedEvents.map(({ payload: _payload, ...event }) => event),
      photoCount: 1
    });
    const screen = render(<GrowTimelineShare workspace="personal" />);

    await waitFor(() =>
      expect(screen.getAllByLabelText("Remove timeline photo")).toHaveLength(2)
    );
    fireEvent.press(screen.getAllByLabelText("Remove timeline photo")[1]);
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));

    await waitFor(() => expect(mockPreview).toHaveBeenCalledTimes(1));
    expect(mockPreview).toHaveBeenCalledWith(
      "personal",
      "grow-1",
      expect.objectContaining({ photoUrls: [firstPhoto] })
    );
    expect(screen.getByText("1 points")).toBeTruthy();
    expect(screen.getByLabelText("Photo 1 for Paired journal entry")).toBeTruthy();
    expect(screen.queryByLabelText("Photo 2 for Paired journal entry")).toBeNull();
  });

  it("selects twelve unique photos when parent and audit events repeat URLs", async () => {
    const repeatedPhotoEvents = Array.from({ length: 13 }, (_, index) => {
      const photoUrl = `/uploads/journal-photo-${index + 1}.jpg`;
      return [
        {
          id: `GrowLog:log-${index + 1}`,
          sourceId: `log-${index + 1}`,
          sourceModel: "GrowLog",
          type: "log_created",
          title: `Journal ${index + 1}`,
          timestamp: `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
          payload: { photos: [photoUrl] }
        },
        {
          id: `GrowLog:log-${index + 1}:photo:0`,
          sourceId: `log-${index + 1}`,
          sourceModel: "GrowLog",
          type: "photo_added",
          title: `Photo ${index + 1}`,
          timestamp: `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
          payload: { linkedLogId: `log-${index + 1}`, photoUrl }
        }
      ];
    }).flat();
    mockGetTimeline.mockResolvedValueOnce(repeatedPhotoEvents);
    const screen = render(<GrowTimelineShare workspace="personal" />);

    await waitFor(() =>
      expect(screen.getByText(/12 of 12 available photos/)).toBeTruthy()
    );
    expect(screen.getAllByLabelText("Remove timeline photo")).toHaveLength(12);
  });

  it("shares the visual story in Forum / Q&A with its canonical preview image", async () => {
    const socialPreviewImageUrl =
      "https://api.growpathai.com/api/public/grow-timelines/preview-token/share-image?v=1234567890abcdef";
    mockGetCurrent.mockResolvedValue({
      ...publishedResult("visual"),
      version: 3,
      cannabisSpecific: true,
      socialPreviewImageUrl,
      photos: [{ url: "https://api.growpathai.com/uploads/first-photo.jpg" }]
    });
    const screen = render(<GrowTimelineShare workspace="personal" />);

    await waitFor(() => expect(screen.getByText("Published version 3")).toBeTruthy());
    expect(mockPublicShareActions).toHaveBeenCalledWith(
      expect.objectContaining({ heading: "Share Visual Grow Story" })
    );

    fireEvent.press(screen.getByLabelText("Share Visual Grow Story in Forum / Q&A"));

    await waitFor(() => expect(mockCreateForumPost).toHaveBeenCalledTimes(1));
    expect(mockCreateForumPost).toHaveBeenCalledWith(
      expect.objectContaining({
        body: `Cannabis content.\n\nExplore the horizontal Visual Grow Story: https://growpathai.com/grow-timeline/${"A".repeat(43)}`,
        photos: [socialPreviewImageUrl],
        tags: ["cannabis", "grow story"],
        authorType: "user",
        visibility: "public"
      })
    );
    expect(
      screen.getByText("The Visual Grow Story was shared in Forum / Q&A.")
    ).toBeTruthy();
  });

  it("restores a published list presentation and uses truthful community wording", async () => {
    const firstPhotoUrl = "https://api.growpathai.com/uploads/list-first-photo.jpg";
    mockGetCurrent.mockResolvedValue({
      ...publishedResult("list"),
      photos: [{ url: firstPhotoUrl }],
      cannabisSpecific: false
    });
    const screen = render(<GrowTimelineShare workspace="personal" />);

    await waitFor(() => expect(screen.getByText("Published version 1")).toBeTruthy());
    expect(screen.getByText("✓ Vertical Detailed List")).toBeTruthy();
    expect(screen.getByText("Preview Grow Timeline List")).toBeTruthy();
    expect(mockPublicShareActions).toHaveBeenCalledWith(
      expect.objectContaining({ heading: "Share Grow Timeline List" })
    );

    fireEvent.press(screen.getByLabelText("Share Grow Timeline List in Forum / Q&A"));

    await waitFor(() => expect(mockCreateForumPost).toHaveBeenCalledTimes(1));
    expect(mockCreateForumPost).toHaveBeenCalledWith(
      expect.objectContaining({
        body: `Explore the detailed Grow Timeline List: https://growpathai.com/grow-timeline/${"A".repeat(43)}`,
        photos: [firstPhotoUrl],
        tags: ["grow story"],
        authorType: "user",
        visibility: "public"
      })
    );
    expect(
      screen.getByText("The Grow Timeline List was shared in Forum / Q&A.")
    ).toBeTruthy();
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
