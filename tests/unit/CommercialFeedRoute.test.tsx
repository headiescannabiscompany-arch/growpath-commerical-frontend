import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialFeedRoute from "@/app/feed";

const mockApiRequest = jest.fn();
const mockPersistImageUri = jest.fn();
const mockPush = jest.fn();
let mockMode = "commercial";

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUri: (...args: any[]) => mockPersistImageUri(...args),
  resolveImageUri: (uri: string) => uri
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    ready: true,
    mode: mockMode,
    plan: mockMode,
    can: () => true
  })
}));

jest.mock("@/components/InlineError", () => ({
  InlineError: () => null
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] }))
}));

describe("CommercialFeedRoute", () => {
  beforeEach(() => {
    mockMode = "commercial";
    mockApiRequest.mockReset();
    mockPersistImageUri.mockReset();
    mockPush.mockReset();
    mockPersistImageUri.mockImplementation(async (uri) => uri);
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/commercial/feed") {
        return Promise.resolve({
          items: [
            {
              id: "campaign-1",
              type: "drop",
              title: "Live soil demo",
              body: "RSVP for the live mixing demo.",
              tags: ["living soil"],
              linkedLiveId: "live-1",
              linkedForumThreadId: "thread-1",
              imageUrl: "https://example.com/live.jpg",
              author: { displayName: "Living Soil Labs" },
              createdAt: "2026-07-07T12:00:00Z"
            }
          ]
        });
      }
      if (path === "/api/commercial/posts" && options?.method === "POST") {
        return Promise.resolve({ post: { id: "campaign-new", ...options.body } });
      }
      if (path === "/api/tasks" && options?.method === "POST") {
        return Promise.resolve({ task: { id: "task-new", ...options.body } });
      }
      return Promise.resolve({});
    });
  });

  it("creates live feed campaigns as outreach with live and Forum/Q&A links", async () => {
    const screen = render(<CommercialFeedRoute />);

    await waitFor(() => expect(screen.getByText("Feed / Campaigns")).toBeTruthy());

    expect(screen.getByText(/Feed is advertising and outreach/i)).toBeTruthy();
    expect(screen.getAllByText("Live event ad").length).toBeGreaterThan(0);
    expect(screen.queryByText("question")).toBeNull();
    expect(screen.queryByText("iso")).toBeNull();
    expect(screen.getByText("0 campaign engagements")).toBeTruthy();
    expect(screen.queryByText("0 likes")).toBeNull();
    expect(screen.getByText("Live: live-1")).toBeTruthy();
    expect(screen.getByText("Forum/Q&A: thread-1")).toBeTruthy();
    expect(
      screen.getByLabelText("Publish feed campaign").props.accessibilityState?.disabled
    ).toBe(true);

    fireEvent.press(screen.getByLabelText("View Live for Live soil demo"));

    expect(mockPush).toHaveBeenCalledWith("/home/commercial/lives?liveId=live-1");
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/analytics/events",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            eventType: "feed_campaign_click",
            objectType: "feed_campaign",
            objectId: "campaign-1",
            targetUrl: "/home/commercial/lives?liveId=live-1",
            source: "commercial_feed",
            metadata: expect.objectContaining({
              campaignKind: "Live event ad",
              destinationLabel: "View Live",
              linkedLiveId: "live-1",
              linkedForumThreadId: "thread-1"
            })
          })
        })
      )
    );

    fireEvent.press(screen.getByLabelText("Select Live event ad campaign type"));
    fireEvent.changeText(screen.getByLabelText("Feed campaign title"), "Friday mix demo");
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign body"),
      "RSVP for the live dry amendment recipe build."
    );
    expect(
      screen.getByLabelText("Publish feed campaign").props.accessibilityState?.disabled
    ).toBe(true);
    fireEvent.press(screen.getByLabelText("Create feed campaign setup task"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Complete feed campaign setup: Friday mix demo",
            sourceType: "feed_campaign",
            sourceId: "Friday mix demo",
            priority: "high",
            status: "open",
            reminderPlan: { label: "24 hours before", channels: ["in_app"] }
          })
        })
      )
    );
    expect(
      screen.getByText("Created campaign setup task for Friday mix demo.")
    ).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Feed campaign tags"), "dry amendments");
    fireEvent.changeText(screen.getByLabelText("Linked live"), "live-demo-1");
    fireEvent.changeText(screen.getByLabelText("Linked forum thread"), "thread-q-and-a");
    fireEvent.changeText(
      screen.getByLabelText("Commercial feed campaign image URL"),
      "https://example.com/demo.jpg"
    );

    await waitFor(() =>
      expect(screen.getByText("Campaign has destination and creative.")).toBeTruthy()
    );
    expect(
      screen.getByLabelText("Publish feed campaign").props.accessibilityState?.disabled
    ).toBe(false);

    fireEvent.press(screen.getByLabelText("Publish feed campaign"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/posts", {
        method: "POST",
        body: expect.objectContaining({
          type: "drop",
          campaignKind: "live_ad",
          title: "Friday mix demo",
          body: "RSVP for the live dry amendment recipe build.",
          tags: ["dry amendments"],
          linkedLiveId: "live-demo-1",
          linkedForumThreadId: "thread-q-and-a",
          imageUrl: "https://example.com/demo.jpg",
          creativeImageUrl: "https://example.com/demo.jpg"
        })
      })
    );
  });

  it("limits facility feed creation to facility outreach", async () => {
    mockMode = "facility";
    const screen = render(<CommercialFeedRoute />);

    await waitFor(() => expect(screen.getByText("Facility Outreach")).toBeTruthy());

    expect(screen.getByText("Facility outreach")).toBeTruthy();
    expect(screen.queryByText("Product ad")).toBeNull();
    expect(
      screen.getByText(/Facility feed campaigns are outreach placements/i)
    ).toBeTruthy();
  });

  it("lets personal users view campaigns without campaign creation controls", async () => {
    mockMode = "personal";
    const screen = render(<CommercialFeedRoute />);

    await waitFor(() => expect(screen.getByText("Campaigns")).toBeTruthy());

    expect(screen.getByText("Promoted Outreach")).toBeTruthy();
    expect(
      screen.getByText(/Personal grow updates, questions, and replies/)
    ).toBeTruthy();
    expect(screen.getByText("Live soil demo")).toBeTruthy();
    expect(screen.queryByText("Create Campaign")).toBeNull();
    expect(screen.queryByLabelText("Publish feed campaign")).toBeNull();
  });

  it("renders a CTA for external-link-only campaigns", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/commercial/feed") {
        return Promise.resolve({
          items: [
            {
              id: "campaign-external",
              type: "update",
              campaignKind: "general_campaign",
              title: "Partner workshop",
              body: "Register for the partner soil workshop.",
              tags: ["education"],
              externalLinks: [{ label: "Register", url: "https://example.com/workshop" }],
              author: { displayName: "Living Soil Labs" },
              createdAt: "2026-07-07T12:00:00Z"
            }
          ]
        });
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialFeedRoute />);

    await waitFor(() => expect(screen.getByText("Partner workshop")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Register for Partner workshop"));

    expect(mockPush).toHaveBeenCalledWith("https://example.com/workshop");
  });
});
