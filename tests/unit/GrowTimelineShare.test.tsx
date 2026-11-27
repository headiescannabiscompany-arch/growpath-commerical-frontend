import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import GrowTimelineShare from "@/features/grows/screens/GrowTimelineShare";

let mockRouteParams = { growId: "grow-1" };
const mockGetGrow = jest.fn();
const mockGetTimeline = jest.fn();
const mockGetCurrent = jest.fn();
const mockPreview = jest.fn();
const mockPublish = jest.fn();
const mockWithdraw = jest.fn();
const mockCreateForumPost = jest.fn();
const mockShareLink = jest.fn();
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
  useLocalSearchParams: () => mockRouteParams,
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
  sharePublicLink: (...args: any[]) => mockShareLink(...args),
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
  mockRouteParams = { growId: "grow-1" };
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

  it("lets the owner choose later photos without exceeding twelve selected photos", async () => {
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
      expect(screen.getByText(/12 of 13 available photos/)).toBeTruthy()
    );
    expect(screen.getAllByLabelText("Remove timeline photo")).toHaveLength(12);
    fireEvent.press(screen.getByLabelText("Include timeline photo"));
    expect(screen.getAllByLabelText("Remove timeline photo")).toHaveLength(12);

    fireEvent.press(screen.getAllByLabelText("Remove timeline photo")[0]);
    fireEvent.press(screen.getAllByLabelText("Include timeline photo")[1]);
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    await waitFor(() => expect(mockPreview).toHaveBeenCalledTimes(1));
    const selected = mockPreview.mock.calls[0][2].photoUrls;
    expect(selected).toHaveLength(12);
    expect(selected).toContain("/uploads/journal-photo-13.jpg");
    expect(selected).not.toContain("/uploads/journal-photo-1.jpg");
  });

  it("keeps review controls locked while preparing and publishes the reviewed selection", async () => {
    let finishReview!: (value: any) => void;
    mockPreview.mockReturnValueOnce(
      new Promise((resolve) => {
        finishReview = resolve;
      })
    );
    const screen = render(<GrowTimelineShare workspace="personal" />);
    await waitFor(() =>
      expect(screen.getByLabelText("Review public grow timeline preview")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));

    expect(screen.getByLabelText("Public timeline title").props.editable).toBe(false);
    expect(screen.getByLabelText("Public timeline description").props.editable).toBe(
      false
    );
    fireEvent.press(screen.getByText("Vertical Detailed List"));
    fireEvent.press(screen.getByLabelText("Remove timeline photo"));
    await act(async () => {
      finishReview(previewResult("visual"));
    });
    fireEvent.press(screen.getByLabelText("Publish reviewed grow timeline"));
    await waitFor(() => expect(mockPublish).toHaveBeenCalledTimes(1));
    expect(mockPublish.mock.calls[0][2]).toEqual(mockPreview.mock.calls[0][2]);
    expect(mockPublish.mock.calls[0][2].presentation).toBe("visual");
    expect(mockPublish.mock.calls[0][2].photoUrls).toHaveLength(1);
  });

  it("previews seven actual milestones and photos without publishing them automatically", async () => {
    const milestones = Array.from({ length: 7 }, (_, index) => ({
      id: `GrowLog:week-${index + 1}`,
      type: "log_created",
      title: `Week ${index + 1}`,
      summary: `Saved observation ${index + 1}`,
      timestamp: `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      payload: { photos: [`/uploads/week-${index + 1}.jpg`] }
    }));
    mockGetTimeline.mockResolvedValueOnce(milestones);
    mockPreview.mockResolvedValueOnce({
      ...previewResult("visual"),
      events: milestones.map(({ payload: _payload, ...event }) => ({
        ...event,
        tags: []
      })),
      photoCount: 7
    });
    const screen = render(<GrowTimelineShare workspace="personal" />);
    await waitFor(() =>
      expect(screen.getAllByLabelText("Remove timeline photo")).toHaveLength(7)
    );
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    await waitFor(() => expect(screen.getByText("7 points")).toBeTruthy());
    expect(screen.getByText("7 included events · 7 public photos")).toBeTruthy();
    expect(mockPreview.mock.calls[0][2].eventIds).toHaveLength(7);
    expect(mockPreview.mock.calls[0][2].photoUrls).toHaveLength(7);
    expect(screen.getByLabelText("Photo 1 for Week 7")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open timeline entry 1: Week 1"));
    expect(screen.getByLabelText("Photo 1 for Week 1")).toBeTruthy();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("restores a one-point published copy without selecting an additional private event", async () => {
    const socialPreviewImageUrl =
      "https://api.growpathai.com/api/public/grow-timelines/preview-token/share-image?v=old";
    mockGetCurrent.mockResolvedValueOnce({
      ...publishedResult("visual"),
      events: [previewResult("visual").events[0]],
      socialPreviewImageUrl
    });
    const screen = render(<GrowTimelineShare workspace="personal" />);
    await waitFor(() =>
      expect(screen.getByText(/1 published timeline point · 0 photos/)).toBeTruthy()
    );
    expect(
      screen.getByText(/Sharing uses this published version, not the selections below/)
    ).toBeTruthy();
    expect(screen.getByText(/1 of 2 saved events selected/)).toBeTruthy();
    expect(
      screen.getByLabelText("Published timeline social preview").props.source
    ).toEqual({ uri: socialPreviewImageUrl });
    expect(mockPublish).not.toHaveBeenCalled();
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

  it("opens the exact published viewer and sends its direct link to a different app", async () => {
    const copy = publishedResult("visual");
    mockShareLink.mockResolvedValue({ method: "web-clipboard" });
    const screen = render(<GrowTimelineShare workspace="personal" />);
    await waitFor(() =>
      expect(screen.getByLabelText("Review public grow timeline preview")).toBeTruthy()
    );
    expect(screen.queryByLabelText("Share published timeline to another app")).toBeNull();
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    await waitFor(() =>
      expect(screen.getByLabelText("Publish reviewed grow timeline")).toBeTruthy()
    );
    expect(mockPublish).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Publish reviewed grow timeline"));
      fireEvent.press(screen.getByLabelText("Publish reviewed grow timeline"));
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Open published grow timeline")).toBeTruthy()
    );
    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockCreateForumPost).not.toHaveBeenCalled();
    expect(mockShareLink).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Open published grow timeline"));
    expect(mockPush).toHaveBeenCalledWith(`/grow-timeline/${copy.token}`);
    fireEvent.press(screen.getByLabelText("Share published timeline to another app"));
    await waitFor(() =>
      expect(screen.getByText("Published timeline link copied.")).toBeTruthy()
    );
    expect(mockShareLink).toHaveBeenCalledWith(
      copy.title,
      `/grow-timeline/${copy.token}`,
      { description: copy.description }
    );
    expect(
      screen.getByText(`https://growpathai.com/grow-timeline/${copy.token}`)
    ).toBeTruthy();
  });

  it("opens the created Forum post without posting it again or attaching the private grow", async () => {
    mockGetCurrent.mockResolvedValue(publishedResult("visual"));
    mockCreateForumPost.mockResolvedValue({ _id: "new-post" });
    const screen = render(<GrowTimelineShare workspace="commercial" />);
    await waitFor(() =>
      expect(screen.getByLabelText("Share Visual Grow Story in Forum / Q&A")).toBeTruthy()
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Share Visual Grow Story in Forum / Q&A"));
      fireEvent.press(screen.getByLabelText("Share Visual Grow Story in Forum / Q&A"));
    });
    expect(mockCreateForumPost).toHaveBeenCalledTimes(1);
    expect(mockCreateForumPost.mock.calls[0][0]).not.toHaveProperty("growId");
    expect(mockCreateForumPost.mock.calls[0][0]).toMatchObject({
      authorType: "commercial",
      workspaceContext: "commercial"
    });
    fireEvent.press(screen.getByText("View your Forum post"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/forum/post",
      params: { id: "new-post" }
    });
    expect(mockCreateForumPost).toHaveBeenCalledTimes(1);
  });

  it("reports a moderation hold without offering a public Forum post", async () => {
    mockGetCurrent.mockResolvedValue(publishedResult("visual"));
    mockCreateForumPost.mockResolvedValue({
      id: "held-post",
      moderationStatus: "held",
      moderationNotice: "A moderator will review this post."
    });
    const screen = render(<GrowTimelineShare />);
    await waitFor(() =>
      expect(screen.getByLabelText("Share Visual Grow Story in Forum / Q&A")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Share Visual Grow Story in Forum / Q&A"));
    await waitFor(() =>
      expect(screen.getByText("A moderator will review this post.")).toBeTruthy()
    );
    expect(screen.queryByText("View your Forum post")).toBeNull();
    expect(screen.queryByText(/was shared in Forum/)).toBeNull();
    expect(screen.queryByLabelText("Share Visual Grow Story in Forum / Q&A")).toBeNull();
  });

  it("reports an unconfirmed publication without offering to share it", async () => {
    mockPublish.mockResolvedValueOnce(null);
    const screen = render(<GrowTimelineShare />);
    await waitFor(() =>
      expect(screen.getByLabelText("Review public grow timeline preview")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    await waitFor(() =>
      expect(screen.getByLabelText("Publish reviewed grow timeline")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Publish reviewed grow timeline"));
    await waitFor(() =>
      expect(screen.getByText(/published link could not be confirmed/)).toBeTruthy()
    );
    expect(screen.queryByLabelText("Open published grow timeline")).toBeNull();
    expect(mockCreateForumPost).not.toHaveBeenCalled();
  });

  it("requires another review when a private change makes the reviewed version stale", async () => {
    const revision = "a".repeat(64);
    mockPreview.mockResolvedValueOnce({
      ...previewResult("visual"),
      previewRevision: revision
    });
    mockPublish.mockRejectedValueOnce({ code: "TIMELINE_PREVIEW_CHANGED" });
    const screen = render(<GrowTimelineShare />);
    fireEvent.press(await screen.findByLabelText("Review public grow timeline preview"));
    fireEvent.press(await screen.findByLabelText("Publish reviewed grow timeline"));
    await screen.findByText(
      "The timeline changed since this preview. Review it again before publishing."
    );
    expect(mockPublish).toHaveBeenCalledWith(
      "personal",
      expect.any(String),
      expect.objectContaining({ previewRevision: revision })
    );
    expect(screen.queryByLabelText("Publish reviewed grow timeline")).toBeNull();
    expect(mockGetCurrent).toHaveBeenCalledTimes(1);
  });

  it("recovers a published version after the confirmation is lost without publishing again", async () => {
    mockGetCurrent
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(publishedResult("visual"));
    mockPublish.mockRejectedValueOnce(new Error("Connection interrupted"));
    const screen = render(<GrowTimelineShare />);
    await waitFor(() =>
      expect(screen.getByLabelText("Review public grow timeline preview")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    await waitFor(() =>
      expect(screen.getByLabelText("Publish reviewed grow timeline")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Publish reviewed grow timeline"));
    await waitFor(() =>
      expect(screen.getByText(/published version was found/)).toBeTruthy()
    );
    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockGetCurrent).toHaveBeenCalledTimes(2);
    fireEvent.press(screen.getByLabelText("Open published grow timeline"));
    expect(mockPush).toHaveBeenCalledWith(`/grow-timeline/${"A".repeat(43)}`);
    expect(mockShareLink).not.toHaveBeenCalled();
    expect(mockCreateForumPost).not.toHaveBeenCalled();
  });

  it("previews precisely the latest 250 entries of a larger history", async () => {
    const many = Array.from({ length: 252 }, (_, i) => ({
      id: `event-${i}`,
      title: `Watering ${i}`,
      type: "log_created",
      timestamp: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(),
      payload: {}
    }));
    mockGetTimeline.mockResolvedValue(many);
    const screen = render(<GrowTimelineShare />);
    await waitFor(() =>
      expect(screen.getByText(/250 of 252 saved events selected/)).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    await waitFor(() => expect(mockPreview).toHaveBeenCalledTimes(1));
    const picked = mockPreview.mock.calls[0][2].eventIds;
    expect(picked).toHaveLength(250);
    expect(picked).toContain("event-251");
    expect(picked).not.toContain("event-1");
  });

  it("restores the exact selected photo from an older published event outside the newest 250", async () => {
    const history = Array.from({ length: 251 }, (_, i) => ({
      id: `event-${i}`,
      title: `Visit ${i}`,
      type: "log_created",
      timestamp: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(),
      payload:
        i === 0 ? { photos: ["/uploads/not-selected.jpg", "/uploads/selected.jpg"] } : {}
    }));
    mockGetTimeline.mockResolvedValueOnce(history);
    mockGetCurrent.mockResolvedValueOnce({
      ...publishedResult("visual"),
      events: [{ id: "event-0" }],
      photos: [{ url: "/public/derived", eventRef: "event-0" }],
      ownerPhotoSources: [["/uploads/legacy-name.jpg", "/uploads/selected.jpg"]]
    });
    const screen = render(<GrowTimelineShare />);
    await waitFor(() =>
      expect(screen.getByText(/1 of 251 saved events selected/)).toBeTruthy()
    );
    expect(screen.getByLabelText("Remove timeline photo")).toBeTruthy();
    expect(screen.getByLabelText("Include timeline photo")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    await waitFor(() =>
      expect(mockPreview).toHaveBeenCalledWith(
        "personal",
        "grow-1",
        expect.objectContaining({
          eventIds: ["event-0"],
          photoUrls: ["/uploads/selected.jpg"]
        })
      )
    );
  });

  it("requires an explicit selection decision when previously published photos cannot be matched", async () => {
    mockGetCurrent.mockResolvedValueOnce({
      ...publishedResult("visual"),
      events: [{ id: events[1].id }],
      photos: [{ url: "/public/photo", eventRef: events[1].id }]
    });
    const screen = render(<GrowTimelineShare />);
    await waitFor(() =>
      expect(screen.getByText(/1 photo that could not be matched/)).toBeTruthy()
    );
    expect(
      screen.getByLabelText("Review public grow timeline preview").props
        .accessibilityState.disabled
    ).toBe(true);
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    expect(mockPreview).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Include timeline photo"));
    fireEvent.press(screen.getByText("Continue with my available selection"));
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    await waitFor(() =>
      expect(mockPreview).toHaveBeenCalledWith(
        "personal",
        "grow-1",
        expect.objectContaining({
          eventIds: [events[1].id],
          photoUrls: [events[1].payload.photoUrl]
        })
      )
    );
  });

  it("discards a prior grow’s late data when moving between workspaces", async () => {
    let finishOld: (copy: any) => void = () => {};
    mockGetCurrent.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        })
    );
    const screen = render(<GrowTimelineShare workspace="personal" />);
    await waitFor(() =>
      expect(mockGetCurrent).toHaveBeenCalledWith("personal", "grow-1")
    );
    mockRouteParams = { growId: "grow-2" };
    mockGetGrow.mockResolvedValueOnce({ name: "Second grow" });
    mockGetTimeline.mockResolvedValueOnce([{ ...events[0], id: "second-grow-entry" }]);
    screen.rerender(<GrowTimelineShare workspace="commercial" />);
    await waitFor(() =>
      expect(screen.getByLabelText("Public timeline title").props.value).toBe(
        "Grow timeline: Second grow"
      )
    );
    await act(async () =>
      finishOld({ ...publishedResult("visual"), title: "Private prior grow" })
    );
    expect(screen.getByLabelText("Public timeline title").props.value).toBe(
      "Grow timeline: Second grow"
    );
    expect(screen.queryByText("Published version 1")).toBeNull();
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    await waitFor(() =>
      expect(mockPreview).toHaveBeenCalledWith(
        "commercial",
        "grow-2",
        expect.objectContaining({ eventIds: ["second-grow-entry"] })
      )
    );
  });

  it("edits the reviewed public title, description, layout, entries and photos before explicitly publishing a fresh preview", async () => {
    const screen = render(<GrowTimelineShare />);
    await waitFor(() =>
      expect(screen.getByLabelText("Review public grow timeline preview")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    await waitFor(() =>
      expect(screen.getByLabelText("Public timeline preview")).toBeTruthy()
    );
    expect(screen.queryByLabelText("Public timeline title")).toBeNull();
    fireEvent.press(screen.getByLabelText("Edit public timeline preview"));
    expect(screen.getByText("Edit public preview")).toBeTruthy();
    expect(screen.queryByLabelText("Publish reviewed grow timeline")).toBeNull();
    fireEvent.changeText(screen.getByLabelText("Public timeline title"), "Balcony basil");
    fireEvent.changeText(
      screen.getByLabelText("Public timeline description"),
      "A public recap"
    );
    fireEvent.press(screen.getByText("Vertical Detailed List"));
    fireEvent.press(screen.getByLabelText("Remove timeline photo"));
    fireEvent.press(screen.getByLabelText("Customize included timeline entries"));
    fireEvent.press(screen.getByLabelText("Remove Week one note"));
    const next = {
      title: "Balcony basil",
      description: "A public recap",
      presentation: "list",
      eventIds: [events[1].id],
      photoUrls: []
    };
    mockPreview.mockResolvedValueOnce({
      ...previewResult("list"),
      title: next.title,
      description: next.description,
      photoCount: 0
    });
    fireEvent.press(screen.getByLabelText("Update public timeline preview"));
    await waitFor(() => expect(screen.getByText("Balcony basil")).toBeTruthy());
    expect(mockPreview).toHaveBeenLastCalledWith("personal", "grow-1", next);
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockShareLink).not.toHaveBeenCalled();
    expect(mockCreateForumPost).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Publish reviewed grow timeline"));
    await waitFor(() =>
      expect(mockPublish).toHaveBeenCalledWith("personal", "grow-1", next)
    );
  });

  it("keeps the edited public draft when a new preview fails, with no publish action for the stale version", async () => {
    mockGetCurrent.mockResolvedValue({
      ...publishedResult("visual"),
      events: [{ id: events[1].id }]
    });
    const screen = render(<GrowTimelineShare />);
    await waitFor(() =>
      expect(screen.getByLabelText("Review public grow timeline preview")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    await waitFor(() =>
      expect(screen.getByLabelText("Edit public timeline preview")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Edit public timeline preview"));
    expect(screen.queryByLabelText("Open published grow timeline")).toBeNull();
    fireEvent.changeText(
      screen.getByLabelText("Public timeline title"),
      "Keep this draft"
    );
    mockPreview.mockRejectedValueOnce(new Error("Please retry the preview."));
    fireEvent.press(screen.getByLabelText("Update preview after editing selections"));
    await waitFor(() =>
      expect(screen.getByText("Please retry the preview.")).toBeTruthy()
    );
    expect(screen.getByLabelText("Public timeline title").props.value).toBe(
      "Keep this draft"
    );
    expect(screen.queryByLabelText("Publish reviewed grow timeline")).toBeNull();
    expect(mockPublish).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Update public timeline preview"));
    await waitFor(() =>
      expect(screen.getByLabelText("Publish reviewed grow timeline")).toBeTruthy()
    );
  });
  it.each(["visual", "list"] as const)(
    "refreshes the %s preview with the specific public caption and suppresses stale publishing",
    async (layout) => {
      const source = previewResult(layout);
      mockPreview.mockResolvedValueOnce({
        ...source,
        previewRevision: "initial-test-revision"
      });
      const screen = render(<GrowTimelineShare />);
      await waitFor(() =>
        expect(screen.getByLabelText("Review public grow timeline preview")).toBeTruthy()
      );
      if (layout === "list") fireEvent.press(screen.getByText("Vertical Detailed List"));
      fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
      await waitFor(() =>
        expect(screen.getByLabelText("Edit wording: Week two photo")).toBeTruthy()
      );
      fireEvent.press(screen.getByLabelText("Edit wording: Week two photo"));
      await waitFor(() =>
        expect(
          screen.getByLabelText("Publish reviewed grow timeline").props.accessibilityState
            .disabled
        ).toBe(true)
      );
      fireEvent.changeText(
        screen.getByLabelText("Public entry caption"),
        "Public caption only"
      );
      let finishReview: (response: any) => void = () => {};
      mockPreview.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishReview = resolve;
          })
      );
      fireEvent.press(screen.getByText("Update preview wording"));
      await waitFor(() => expect(mockPreview).toHaveBeenCalledTimes(2));
      expect(mockPreview).toHaveBeenLastCalledWith(
        "personal",
        "grow-1",
        expect.objectContaining({
          eventTextOverrides: [
            { eventId: source.events[0].id, summary: "Public caption only" }
          ]
        })
      );
      expect(
        screen.getByLabelText("Publish reviewed grow timeline").props.accessibilityState
          .disabled
      ).toBe(true);
      await act(async () =>
        finishReview({
          ...source,
          previewRevision: "updated-test-revision",
          events: [{ ...source.events[0], summary: "Reviewed public caption" }]
        })
      );
      await waitFor(() =>
        expect(screen.getByText("Reviewed public caption")).toBeTruthy()
      );
      expect(
        screen.getByLabelText("Publish reviewed grow timeline").props.accessibilityState
          .disabled
      ).toBe(false);
      expect(mockPublish).not.toHaveBeenCalled();
    }
  );

  it("requires confirmation from a wording-aware preview service and keeps the draft on an older server", async () => {
    const screen = render(<GrowTimelineShare />);
    await waitFor(() =>
      expect(screen.getByLabelText("Review public grow timeline preview")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Review public grow timeline preview"));
    await waitFor(() =>
      expect(screen.getByLabelText("Edit wording: Week two photo")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Edit wording: Week two photo"));
    fireEvent.changeText(
      screen.getByLabelText("Public entry caption"),
      "Revised public wording"
    );
    fireEvent.press(screen.getByText("Update preview wording"));
    await waitFor(() =>
      expect(
        screen.getByText(/server could not confirm the edited public wording/)
      ).toBeTruthy()
    );
    expect(screen.queryByLabelText("Publish reviewed grow timeline")).toBeNull();
    mockPreview.mockResolvedValueOnce({
      ...previewResult("visual"),
      previewRevision: "new-server-revision"
    });
    fireEvent.press(screen.getByLabelText("Update public timeline preview"));
    await waitFor(() =>
      expect(screen.getByLabelText("Publish reviewed grow timeline")).toBeTruthy()
    );
    expect(mockPreview.mock.calls[2][2].eventTextOverrides).toEqual([
      { eventId: events[1].id, summary: "Revised public wording" }
    ]);
    expect(mockPublish).not.toHaveBeenCalled();
  });
  it("restores a published list presentation and uses truthful community wording", async () => {
    const firstPhotoUrl = "https://api.growpathai.com/uploads/list-first-photo.jpg";
    mockGetCurrent.mockResolvedValue({
      ...publishedResult("list"),
      events: [
        { ...previewResult("list").events[0], id: "GrowLog:log-2", type: "log_created" },
        previewResult("list").events[0]
      ],
      photos: [{ url: firstPhotoUrl }],
      cannabisSpecific: false
    });
    const screen = render(<GrowTimelineShare workspace="personal" />);

    await waitFor(() => expect(screen.getByText("Published version 1")).toBeTruthy());
    expect(screen.getByText("✓ Vertical Detailed List")).toBeTruthy();
    expect(screen.getByText(/2 published list entries · 1 photo/)).toBeTruthy();
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
