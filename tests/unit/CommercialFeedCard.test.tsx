import React from "react";
import { render } from "@testing-library/react-native";

import CommercialFeedCard from "../../src/components/commercial/CommercialFeedCard";

jest.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "owner-1" } })
}));

describe("CommercialFeedCard", () => {
  const basePost = {
    id: "campaign-1",
    author: {
      id: "brand-1",
      displayName: "Living Soil Labs",
      email: "soil@example.com",
      role: "commercial",
      plan: "commercial",
      subscriptionStatus: "active"
    },
    type: "drop",
    title: "Live soil demo",
    body: "RSVP for the live mixing demo.",
    tags: ["living soil"],
    engagementCount: 12,
    linkedLiveId: "live-1",
    createdAt: "2026-07-07T12:00:00Z"
  };

  it("renders commercial feed as a campaign card, not a discussion card", () => {
    const screen = render(<CommercialFeedCard post={basePost} />);

    expect(screen.getByText("Live soil demo")).toBeTruthy();
    expect(screen.getByText("View Live")).toBeTruthy();
    expect(screen.getByText("12 campaign engagements")).toBeTruthy();
    expect(screen.queryByText("Like")).toBeNull();
    expect(screen.queryByText(/comments/i)).toBeNull();
  });

  it("recognizes storefront slug aliases as storefront campaign destinations", () => {
    const screen = render(
      <CommercialFeedCard
        post={{
          ...basePost,
          linkedLiveId: undefined,
          brandSlug: "living-soil-labs"
        }}
      />
    );

    expect(screen.getByText("Visit Storefront")).toBeTruthy();
    expect(screen.queryByText("Learn More")).toBeNull();
  });
});
