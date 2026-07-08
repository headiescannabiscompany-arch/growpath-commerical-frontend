import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import FacilityFeedCampaignsRoute from "@/app/home/facility/feed";

const mockApiRequest = jest.fn();

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({ campaignId: "facility-campaign-1" }),
  useRouter: () => ({ push: jest.fn() })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUri: async (uri: string) => uri,
  resolveImageUri: (uri: string) => uri
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    ready: true,
    mode: "facility",
    plan: "facility",
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

describe("FacilityFeedCampaignsRoute", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/commercial/feed") {
        return Promise.resolve({
          items: [
            {
              id: "facility-campaign-1",
              type: "education",
              campaignKind: "facility_outreach",
              title: "Facility IPM training",
              body: "Public professional training on scout records.",
              authorType: "facility",
              workspaceType: "facility",
              createdAt: "2026-07-07T12:00:00Z"
            }
          ]
        });
      }
      return Promise.resolve({});
    });
  });

  it("renders facility outreach campaigns at the facility source-link route", async () => {
    const screen = render(<FacilityFeedCampaignsRoute />);

    await waitFor(() => expect(screen.getByText("Facility Outreach")).toBeTruthy());
    expect(screen.getByText("Facility IPM training")).toBeTruthy();
    expect(screen.getAllByText("Facility outreach").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Selected feed campaign facility-campaign-1")).toBeTruthy();
  });
});
