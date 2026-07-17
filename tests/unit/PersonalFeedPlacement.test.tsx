import React from "react";
import { render, screen } from "@testing-library/react-native";

import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";

const mockEntitlements = {
  mode: "personal",
  plan: "free"
};

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlements
}));

describe("PersonalFeedPlacement", () => {
  beforeEach(() => {
    mockEntitlements.mode = "personal";
    mockEntitlements.plan = "free";
  });

  it("renders top, middle, and bottom placements for long free personal pages", () => {
    render(
      <>
        <PersonalFeedPlacement placement="top" routeKey="personal_grows" longContent />
        <PersonalFeedPlacement placement="middle" routeKey="personal_grows" longContent />
        <PersonalFeedPlacement placement="bottom" routeKey="personal_grows" longContent />
      </>
    );

    expect(screen.getByLabelText("Promoted campaigns placement")).toBeTruthy();
    expect(screen.getByLabelText("More promoted campaigns placement")).toBeTruthy();
    expect(screen.getByLabelText("Recommended campaigns placement")).toBeTruthy();
    expect(screen.getAllByText("Promoted campaign").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Explore grower storefronts")).toBeTruthy();
    expect(screen.getByText("Learn from grower courses")).toBeTruthy();
    expect(screen.getByText("Plan the next grow")).toBeTruthy();
    expect(
      screen.getAllByText(
        "Want to see fewer ads? Paid accounts get at least 50% fewer ads."
      ).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders top and bottom placements for short free personal pages", () => {
    render(
      <>
        <PersonalFeedPlacement placement="top" routeKey="personal_profile" />
        <PersonalFeedPlacement placement="middle" routeKey="personal_profile" />
        <PersonalFeedPlacement placement="bottom" routeKey="personal_profile" />
      </>
    );

    expect(screen.getByLabelText("Promoted campaigns placement")).toBeTruthy();
    expect(screen.queryByLabelText("More promoted campaigns placement")).toBeNull();
    expect(screen.getByLabelText("Recommended campaigns placement")).toBeTruthy();
    expect(screen.getAllByText("Promoted campaign").length).toBeGreaterThanOrEqual(2);
  });

  it("keeps paid personal pages to the top placement only", () => {
    mockEntitlements.plan = "pro";

    render(
      <>
        <PersonalFeedPlacement placement="top" routeKey="personal_profile" longContent />
        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_profile"
          longContent
        />
        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_profile"
          longContent
        />
      </>
    );

    expect(screen.getByLabelText("Promoted campaigns placement")).toBeTruthy();
    expect(screen.getByText("Promoted campaign")).toBeTruthy();
    expect(screen.queryByLabelText("More promoted campaigns placement")).toBeNull();
    expect(screen.queryByLabelText("Recommended campaigns placement")).toBeNull();
  });

  it("renders promo campaign placements for the main personal landing page", () => {
    render(
      <>
        <PersonalFeedPlacement placement="top" routeKey="home" longContent />
        <PersonalFeedPlacement placement="middle" routeKey="home" longContent />
        <PersonalFeedPlacement placement="bottom" routeKey="home" longContent />
      </>
    );

    expect(screen.getByLabelText("Promoted campaigns placement")).toBeTruthy();
    expect(screen.getByLabelText("More promoted campaigns placement")).toBeTruthy();
    expect(screen.getByLabelText("Recommended campaigns placement")).toBeTruthy();
    expect(screen.getAllByText("Promoted campaign").length).toBeGreaterThanOrEqual(3);
  });
});
