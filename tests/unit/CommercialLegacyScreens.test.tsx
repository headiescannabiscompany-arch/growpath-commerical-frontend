import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CampaignsScreen from "@/screens/CampaignsScreen";
import CommercialOrdersScreen from "@/screens/CommercialOrdersScreen";

const mockCreateCampaign = jest.fn();
const mockRefetchOrders = jest.fn();
const mockMutateOrder = jest.fn();

jest.mock("@/hooks/useCampaigns", () => ({
  useCampaigns: () => ({
    data: [
      {
        id: "plan-1",
        name: "Soil launch ad",
        status: "active",
        adClicks: 42,
        linkClicks: 19,
        impressions: 1000
      }
    ],
    isLoading: false,
    error: null,
    createCampaign: (...args: any[]) => mockCreateCampaign(...args),
    creating: false
  })
}));

jest.mock("@/hooks/useOrders", () => ({
  useOrders: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: (...args: any[]) => mockRefetchOrders(...args),
    isRefetching: false
  }),
  useUpdateOrderFulfillment: () => ({
    mutateAsync: (...args: any[]) => mockMutateOrder(...args),
    isPending: false
  })
}));

describe("commercial legacy screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateCampaign.mockResolvedValue({});
    mockMutateOrder.mockResolvedValue({});
  });

  it("frames campaigns as a marketing planner and saves linked content context", async () => {
    const screen = render(<CampaignsScreen />);

    expect(screen.getByText("Marketing Planner")).toBeTruthy();
    expect(screen.getByText(/Feed \/ Campaigns/i)).toBeTruthy();
    expect(screen.getByText("Ad clicks")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("Link clicks")).toBeTruthy();
    expect(screen.getByText("19")).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText("Plan name"), "Spring soil drop");
    fireEvent.changeText(
      screen.getByPlaceholderText("Linked product, course, evidence run, or store URL"),
      "product-1"
    );
    fireEvent.changeText(screen.getByPlaceholderText("Launch date or window"), "April");
    fireEvent.changeText(
      screen.getByPlaceholderText("Content notes, platform notes, budget notes, or CTA"),
      "Announce trial results through a feed campaign"
    );
    fireEvent.press(screen.getByText("Add Marketing Plan"));

    await waitFor(() =>
      expect(mockCreateCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Spring soil drop",
          objective: "content_plan",
          linkedTarget: "product-1",
          launchDate: "April",
          notes: "Announce trial results through a feed campaign"
        })
      )
    );
  });

  it("frames orders as internal checkout plus external tracking context", () => {
    const screen = render(<CommercialOrdersScreen />);

    expect(screen.getByText("Orders")).toBeTruthy();
    expect(screen.getByText(/Internal checkout orders appear here/i)).toBeTruthy();
    expect(screen.getByText(/No internal orders yet/i)).toBeTruthy();
  });
});
