import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialFeedRoute from "@/app/feed";

const mockApiRequest = jest.fn();
const mockPersistImageUri = jest.fn();
const mockPush = jest.fn();
let mockMode = "commercial";
let mockRouteParams: Record<string, string> = { campaignId: "campaign-1" };

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useLocalSearchParams: () => mockRouteParams,
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
    facilityId: mockMode === "facility" ? "facility-1" : null,
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
    mockRouteParams = { campaignId: "campaign-1" };
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
              growInterests: ["living soil", "dry amendments"],
              linkedProductLineId: "line-1",
              linkedLiveId: "live-1",
              linkedTrialId: "trial-1",
              linkedGrowId: "grow-1",
              linkedForumThreadId: "thread-1",
              engagementCount: 12,
              startsAt: "2026-07-17T21:00:00Z",
              endsAt: "2026-07-24T21:00:00Z",
              imageUrl: "https://example.com/live.jpg",
              author: { displayName: "Living Soil Labs" },
              createdAt: "2026-07-07T12:00:00Z"
            }
          ]
        });
      }
      if (path === "/api/commercial/feed" && options?.method === "POST") {
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
    expect(
      screen.getByRole("radio", {
        name: "Select Product ad campaign type"
      }).props.accessibilityState?.checked
    ).toBe(true);
    expect(
      screen.getByRole("checkbox", {
        name: "Remove All Feed placements placement"
      }).props.accessibilityState?.checked
    ).toBe(true);
    expect(screen.getByLabelText("Campaign placements").props.role).toBe("group");
    expect(
      screen.getByRole("radio", {
        name: "Filter feed by all"
      }).props.accessibilityState?.checked
    ).toBe(true);
    expect(
      screen.getByRole("button", {
        name: "Publish feed campaign"
      })
    ).toBeTruthy();
    expect(
      screen.getByPlaceholderText(
        "Campaign message, offer, announcement, or educational promotion"
      )
    ).toBeTruthy();
    expect(screen.getByLabelText("Search campaigns")).toBeTruthy();
    expect(screen.getAllByText("Live event ad").length).toBeGreaterThan(0);
    expect(screen.queryByText("question")).toBeNull();
    expect(screen.queryByText("iso")).toBeNull();
    expect(screen.getByText("12 campaign engagements")).toBeTruthy();
    expect(screen.getByLabelText("Selected feed campaign campaign-1")).toBeTruthy();
    expect(screen.getByText("Interests: living soil, dry amendments")).toBeTruthy();
    expect(screen.getByText("Product line: line-1")).toBeTruthy();
    expect(screen.queryByText("0 likes")).toBeNull();
    expect(screen.getByText("Live: live-1")).toBeTruthy();
    expect(screen.getByText("Evidence run: trial-1")).toBeTruthy();
    expect(screen.getByText("Forum/Q&A: thread-1")).toBeTruthy();
    expect(screen.getByText("Starts: 2026-07-17T21:00:00Z")).toBeTruthy();
    expect(screen.getByText("Ends: 2026-07-24T21:00:00Z")).toBeTruthy();
    expect(
      screen.getByLabelText("Publish feed campaign").props.accessibilityState?.disabled
    ).toBe(true);

    fireEvent.press(screen.getByLabelText("View Live for Live soil demo"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/feed/campaign-1/events",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ eventType: "click", placement: "feed" })
        })
      )
    );

    expect(mockPush).toHaveBeenCalledWith("/live-session?sessionId=live-1");
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/analytics/events",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            eventType: "feed_campaign_click",
            objectType: "feed_campaign",
            objectId: "campaign-1",
            targetUrl: "/live-session?sessionId=live-1",
            source: "commercial_feed",
            metadata: expect.objectContaining({
              campaignKind: "Live event ad",
              destinationLabel: "View Live",
              growInterests: ["living soil", "dry amendments"],
              linkedProductLineId: "line-1",
              linkedLiveId: "live-1",
              linkedTrialId: "trial-1",
              linkedGrowId: "grow-1",
              linkedForumThreadId: "thread-1",
              startsAt: "2026-07-17T21:00:00Z",
              endsAt: "2026-07-24T21:00:00Z"
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
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign grow interests"),
      "living soil, recipe building"
    );
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign schedule start"),
      "2026-07-17T21:00:00Z"
    );
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign schedule end"),
      "2026-07-24T21:00:00Z"
    );
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign reminder"),
      "1 hour before"
    );
    fireEvent.changeText(screen.getByLabelText("Feed campaign recurrence"), "weekly");
    fireEvent.changeText(screen.getByLabelText("Linked evidence run"), "trial-demo-1");
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
            sourceObjectId: "Friday mix demo",
            campaignKind: "live_ad",
            campaignTitle: "Friday mix demo",
            linkedTrialId: "trial-demo-1",
            linkedGrowId: "trial-demo-1",
            growInterests: ["living soil", "recipe building"],
            campaignStartsAt: "2026-07-17T21:00:00Z",
            campaignEndsAt: "2026-07-24T21:00:00Z",
            recurrenceRule: "weekly",
            allDay: true,
            calendarType: "commercial_feed_campaign_setup",
            sourceStage: "live_ad_campaign_readiness",
            dueAt: "2026-07-17",
            priority: "high",
            status: "open",
            reminderPlan: { label: "1 hour before", channels: ["in_app"] }
          })
        })
      )
    );
    expect(
      screen.getByText("Created campaign setup task for Friday mix demo.")
    ).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Feed campaign tags"), "dry amendments");
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign grow interests"),
      "living soil, recipe building"
    );
    fireEvent.changeText(screen.getByLabelText("Linked live"), "live-demo-1");
    fireEvent.changeText(screen.getByLabelText("Linked product line"), "line-demo-1");
    fireEvent.changeText(screen.getByLabelText("Linked forum thread"), "thread-q-and-a");
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign image URL"),
      "https://example.com/demo.jpg"
    );
    await waitFor(() =>
      expect(screen.getByText("Campaign has destination and creative.")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Add Tools placement"));
    fireEvent.changeText(screen.getByLabelText("Campaign CTA label"), "Reserve seat");
    expect(screen.getByLabelText("Campaign review")).toBeTruthy();
    expect(screen.getByText(/Live event ad · 2 placements/)).toBeTruthy();
    expect(screen.getByText(/CTA: Reserve seat/)).toBeTruthy();
    expect(
      screen.getByLabelText("Publish feed campaign").props.accessibilityState?.disabled
    ).toBe(false);

    fireEvent.press(screen.getByLabelText("Publish feed campaign"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/feed", {
        method: "POST",
        body: expect.objectContaining({
          type: "drop",
          campaignKind: "live_ad",
          authorType: "commercial",
          workspaceType: "commercial",
          title: "Friday mix demo",
          body: "RSVP for the live dry amendment recipe build.",
          tags: ["dry amendments"],
          growInterests: ["living soil", "recipe building"],
          linkedLiveId: "live-demo-1",
          linkedProductLineId: "line-demo-1",
          linkedTrialId: "trial-demo-1",
          linkedGrowId: "trial-demo-1",
          linkedForumThreadId: "thread-q-and-a",
          imageUrl: "https://example.com/demo.jpg",
          creativeImageUrl: "https://example.com/demo.jpg",
          startsAt: "2026-07-17T21:00:00Z",
          endsAt: "2026-07-24T21:00:00Z",
          reminderPreference: "1 hour before",
          recurrenceRule: "weekly",
          placements: ["feed", "tool"],
          cta: { label: "Reserve seat", kind: "open" }
        })
      })
    );
  });

  it("focuses a linked live campaign from live reminder route params", async () => {
    mockRouteParams = { liveId: "live-1" };

    const screen = render(<CommercialFeedRoute />);

    await waitFor(() => expect(screen.getByText("Live soil demo")).toBeTruthy());

    expect(screen.getByLabelText("Selected feed live live-1")).toBeTruthy();
  });

  it("blocks publishing when destination or schedule setup is broken", async () => {
    const screen = render(<CommercialFeedRoute />);

    await waitFor(() => expect(screen.getByText("Feed / Campaigns")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Select General campaign campaign type"));
    fireEvent.changeText(screen.getByLabelText("Feed campaign title"), "Workshop");
    fireEvent.changeText(screen.getByLabelText("Feed campaign body"), "Join us live.");
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign image URL"),
      "https://example.com/workshop.jpg"
    );
    fireEvent.changeText(screen.getByLabelText("External link URL"), "not-a-url");
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign schedule start"),
      "2026-07-25T12:00:00Z"
    );
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign schedule end"),
      "2026-07-24T12:00:00Z"
    );

    expect(
      screen.getAllByText(/External destination must start with/).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Campaign end must be after its start/).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("Publish feed campaign").props.accessibilityState?.disabled
    ).toBe(true);

    fireEvent.changeText(
      screen.getByLabelText("External link URL"),
      "https://example.com/workshop"
    );
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign schedule end"),
      "2026-07-26T12:00:00Z"
    );

    expect(screen.getByText("Ready to publish.")).toBeTruthy();
    expect(
      screen.getByLabelText("Publish feed campaign").props.accessibilityState?.disabled
    ).toBe(false);
  });

  it("focuses exact campaign routes when the API returns campaign id aliases", async () => {
    mockRouteParams = { campaignId: "campaign-alias-1" };
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/commercial/feed") {
        return Promise.resolve({
          items: [
            {
              campaignId: "campaign-alias-1",
              type: "update",
              campaignKind: "storefront_ad",
              title: "Alias storefront campaign",
              body: "Campaign id came back under a campaign alias.",
              tags: ["storefront"],
              growInterests: ["education"],
              storefrontSlug: "living-soil-labs",
              authorType: "commercial"
            }
          ]
        });
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialFeedRoute />);

    await waitFor(() =>
      expect(screen.getByText("Alias storefront campaign")).toBeTruthy()
    );

    expect(screen.getByLabelText("Selected feed campaign campaign-alias-1")).toBeTruthy();
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
    await waitFor(() =>
      expect(screen.getByText("No public course records are available yet.")).toBeTruthy()
    );
    expect(screen.queryByLabelText("Linked course")).toBeNull();
    expect(screen.getByLabelText("Show advanced destination references")).toBeTruthy();
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

  it("uses commercial or facility account labels when campaign author data is missing", async () => {
    mockMode = "personal";
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/commercial/feed") {
        return Promise.resolve({
          items: [
            {
              id: "facility-outreach",
              type: "education",
              campaignKind: "facility_outreach",
              title: "Facility IPM training",
              body: "Public training session for IPM scouting.",
              tags: ["IPM"],
              authorType: "facility",
              workspaceType: "facility",
              createdAt: "2026-07-07T12:00:00Z"
            },
            {
              id: "storefront-campaign",
              type: "update",
              campaignKind: "storefront_ad",
              title: "Storefront launch",
              body: "New storefront is live.",
              tags: ["storefront"],
              authorType: "commercial",
              workspaceType: "commercial",
              createdAt: "2026-07-07T13:00:00Z"
            }
          ]
        });
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialFeedRoute />);

    await waitFor(() => expect(screen.getByText("Facility IPM training")).toBeTruthy());

    expect(screen.getByText(/Facility account/)).toBeTruthy();
    expect(screen.getByText(/Commercial account/)).toBeTruthy();
    expect(screen.queryByText(/GrowPath member/)).toBeNull();
    expect(screen.getAllByText("View Outreach")).toHaveLength(2);
    fireEvent.press(screen.getByLabelText("View Outreach for Facility IPM training"));
    expect(mockPush).toHaveBeenCalledWith("/feed?campaignId=facility-outreach");
  });

  it("creates facility outreach campaigns with facility author identity", async () => {
    mockMode = "facility";
    const screen = render(<CommercialFeedRoute />);

    await waitFor(() => expect(screen.getByText("Facility Outreach")).toBeTruthy());

    fireEvent.changeText(screen.getByLabelText("Feed campaign title"), "IPM training");
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign body"),
      "Public facility training on scout records."
    );
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign grow interests"),
      "IPM, facility training"
    );
    expect(
      screen.getByLabelText("Publish facility outreach").props.accessibilityState
        ?.disabled
    ).toBe(true);
    fireEvent.press(screen.getByLabelText("Show advanced destination references"));
    fireEvent.changeText(screen.getByLabelText("Linked course"), "course-ipm-1");
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign image URL"),
      "https://example.com/ipm-training.jpg"
    );
    expect(screen.getByLabelText("Campaign review")).toBeTruthy();
    expect(screen.getByText("Ready to publish.")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Publish facility outreach"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/feed", {
        method: "POST",
        body: expect.objectContaining({
          type: "education",
          campaignKind: "facility_outreach",
          authorType: "facility",
          workspaceType: "facility",
          ownerType: "facility",
          facilityId: "facility-1",
          campaignType: "facility",
          title: "IPM training",
          body: "Public facility training on scout records.",
          growInterests: ["IPM", "facility training"],
          linkedCourseId: "course-ipm-1",
          placements: ["facility"],
          imageUrl: "https://example.com/ipm-training.jpg"
        })
      })
    );
  });

  it("selects named public Facility outreach destinations without exposing raw ids", async () => {
    mockMode = "facility";
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/courses") {
        return Promise.resolve({
          courses: [
            {
              _id: "course-public-ipm-1",
              title: "Integrated Pest Management Basics",
              shortDescription: "Scouting and prevention training"
            }
          ]
        });
      }
      if (path === "/api/lives") {
        return Promise.resolve({
          lives: [
            {
              id: "live-public-1",
              title: "Weekly Facility Safety Review",
              status: "scheduled"
            }
          ]
        });
      }
      if (path === "/api/commercial/courses/public") {
        return Promise.resolve({
          courses: [
            {
              id: "course-commercial-safety-1",
              title: "Commercial Facility Safety",
              status: "published"
            }
          ]
        });
      }
      if (path === "/api/forum/feed/latest") {
        return Promise.resolve({
          posts: [
            {
              id: "thread-public-1",
              title: "Ask an IPM Scout",
              categoryName: "IPM"
            }
          ]
        });
      }
      if (path === "/api/commercial/feed") {
        return Promise.resolve({ items: [] });
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialFeedRoute />);

    await waitFor(() =>
      expect(screen.getByText("Integrated Pest Management Basics")).toBeTruthy()
    );
    expect(screen.getByText("Weekly Facility Safety Review")).toBeTruthy();
    expect(screen.getByText("Commercial Facility Safety")).toBeTruthy();
    expect(screen.getByText("Ask an IPM Scout")).toBeTruthy();
    expect(screen.queryByText("course-public-ipm-1")).toBeNull();
    expect(screen.queryByLabelText("Linked course")).toBeNull();

    fireEvent.press(
      screen.getByLabelText("Select Course Integrated Pest Management Basics")
    );
    expect(
      screen.getByText("Selected course: Integrated Pest Management Basics")
    ).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Feed campaign title"), "IPM training");
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign body"),
      "Public facility training on scout records."
    );
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign image URL"),
      "https://example.com/ipm-training.jpg"
    );
    expect(screen.getByText("Ready to publish.")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Publish facility outreach"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/feed",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ linkedCourseId: "course-public-ipm-1" })
        })
      )
    );
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

  it("shows campaign analytics and records hide/report actions", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/commercial/feed") {
        return Promise.resolve({
          items: [
            {
              id: "campaign-metrics",
              type: "update",
              title: "Analytics campaign",
              body: "Measure this outreach campaign.",
              tags: [],
              growInterests: ["vegetables"]
            }
          ]
        });
      }
      if (path === "/api/commercial/feed-analytics") {
        return Promise.resolve({
          analytics: {
            totals: { impressions: 12, clicks: 4, conversions: 2, hides: 1, reports: 1 },
            campaigns: [],
            placements: [
              {
                key: "feed",
                impressions: 12,
                clicks: 4,
                conversions: 2,
                hides: 1,
                reports: 1
              }
            ],
            growInterests: [
              {
                key: "vegetables",
                impressions: 8,
                clicks: 3,
                conversions: 1,
                hides: 0,
                reports: 0
              }
            ]
          }
        });
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialFeedRoute />);
    await waitFor(() =>
      expect(screen.getByLabelText("Feed campaign analytics")).toBeTruthy()
    );
    expect(screen.getByText(/Grow interest vegetables: 8 impressions/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Report Analytics campaign"));
    expect(screen.queryByText("Analytics campaign")).toBeNull();
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/feed/campaign-metrics/events",
        expect.objectContaining({
          body: expect.objectContaining({ eventType: "report" })
        })
      )
    );
  });

  it("routes campaign Q&A CTAs through the shared forum route", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/commercial/feed") {
        return Promise.resolve({
          items: [
            {
              id: "campaign-forum",
              type: "education",
              campaignKind: "course_ad",
              title: "NPK recipe workshop Q&A",
              body: "Ask questions before the recipe workshop.",
              tags: ["NPK"],
              linkedForumThreadId: "thread-qna",
              author: { displayName: "Living Soil Labs" },
              createdAt: "2026-07-07T12:00:00Z"
            }
          ]
        });
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialFeedRoute />);

    await waitFor(() => expect(screen.getByText("NPK recipe workshop Q&A")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Open Forum Q&A for NPK recipe workshop Q&A"));

    expect(mockPush).toHaveBeenCalledWith("/forum/post?id=thread-qna");
  });

  it("routes product and course campaigns through storefront slug aliases when present", async () => {
    mockMode = "personal";
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/commercial/feed") {
        return Promise.resolve({
          items: [
            {
              id: "campaign-product",
              type: "listing",
              campaignKind: "product_ad",
              title: "3-1-1 Veg Mix",
              body: "A product ad with a brand slug opens the storefront product page.",
              linkedProductId: "veg-mix-1",
              brandSlug: "living-soil-labs",
              author: { displayName: "Living Soil Labs" },
              createdAt: "2026-07-07T12:00:00Z"
            },
            {
              id: "campaign-course",
              type: "education",
              campaignKind: "course_ad",
              title: "NPK Recipe Builder",
              body: "A course ad with a linked storefront slug opens the storefront course page.",
              linkedCourseId: "course-npk-1",
              linkedStorefrontSlug: "living-soil-labs",
              author: { displayName: "Living Soil Labs" },
              createdAt: "2026-07-07T13:00:00Z"
            },
            {
              id: "campaign-storefront-course",
              type: "education",
              campaignKind: "course_ad",
              title: "Soil Builder Masterclass",
              body: "A course ad with a storefront slug opens the brand course page.",
              linkedCourseId: "course-soil-1",
              storefrontSlug: "living-soil-labs",
              author: { displayName: "Living Soil Labs" },
              createdAt: "2026-07-07T14:00:00Z"
            }
          ]
        });
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialFeedRoute />);

    await waitFor(() => expect(screen.getByText("3-1-1 Veg Mix")).toBeTruthy());
    expect(screen.getAllByText("Store: living-soil-labs").length).toBeGreaterThan(0);

    fireEvent.press(screen.getByLabelText("View Product for 3-1-1 Veg Mix"));
    fireEvent.press(screen.getByLabelText("View Course for NPK Recipe Builder"));
    fireEvent.press(screen.getByLabelText("View Course for Soil Builder Masterclass"));

    expect(mockPush).toHaveBeenCalledWith("/store/living-soil-labs/products/veg-mix-1");
    expect(mockPush).toHaveBeenCalledWith("/store/living-soil-labs/courses/course-npk-1");
    expect(mockPush).toHaveBeenCalledWith(
      "/store/living-soil-labs/courses/course-soil-1"
    );
    expect(mockPush).not.toHaveBeenCalledWith("/home/commercial/products/veg-mix-1");
    expect(mockPush).not.toHaveBeenCalledWith("/home/commercial/courses/course-npk-1");
  });
});
