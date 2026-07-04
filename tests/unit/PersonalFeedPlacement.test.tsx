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

    expect(screen.getByLabelText("GrowPath feed placement")).toBeTruthy();
    expect(screen.getByLabelText("More from the feed placement")).toBeTruthy();
    expect(screen.getByLabelText("From the feed placement")).toBeTruthy();
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

    expect(screen.getByLabelText("GrowPath feed placement")).toBeTruthy();
    expect(screen.queryByLabelText("More from the feed placement")).toBeNull();
    expect(screen.queryByLabelText("From the feed placement")).toBeNull();
  });

  it("does not render banners for the main personal landing page", () => {
    render(
      <>
        <PersonalFeedPlacement placement="top" routeKey="home" longContent />
        <PersonalFeedPlacement placement="middle" routeKey="home" longContent />
        <PersonalFeedPlacement placement="bottom" routeKey="home" longContent />
      </>
    );

    expect(screen.queryByLabelText("GrowPath feed placement")).toBeNull();
    expect(screen.queryByLabelText("More from the feed placement")).toBeNull();
    expect(screen.queryByLabelText("From the feed placement")).toBeNull();
  });
});
