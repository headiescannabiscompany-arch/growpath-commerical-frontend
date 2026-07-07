import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialFeedRoute from "@/app/feed";

const mockApiRequest = jest.fn();
const mockPersistImageUri = jest.fn();
let mockMode = "commercial";

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
      return Promise.resolve({});
    });
  });

  it("creates live feed campaigns as outreach with live and Forum/Q&A links", async () => {
    const screen = render(<CommercialFeedRoute />);

    await waitFor(() => expect(screen.getByText("Feed / Campaigns")).toBeTruthy());

    expect(screen.getByText(/Feed is advertising and outreach/i)).toBeTruthy();
    expect(screen.getByText("Live: live-1")).toBeTruthy();
    expect(screen.getByText("Forum/Q&A: thread-1")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Select Live event ad campaign type"));
    fireEvent.changeText(screen.getByLabelText("Feed campaign title"), "Friday mix demo");
    fireEvent.changeText(
      screen.getByLabelText("Feed campaign body"),
      "RSVP for the live dry amendment recipe build."
    );
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

    fireEvent.press(screen.getByLabelText("Publish feed campaign"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/posts", {
        method: "POST",
        body: expect.objectContaining({
          type: "drop",
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
});
