import React from "react";
import { render } from "@testing-library/react-native";
import PublicLandingPage, {
  PUBLIC_PAGE_COPY
} from "@/components/marketing/PublicLandingPage";

describe("PublicLandingPage", () => {
  it("renders crawl-aligned facility workflow copy and public navigation", () => {
    const screen = render(<PublicLandingPage page="facility-management" />);

    expect(screen.getByText("Facility → Room → Grow → Plant")).toBeTruthy();
    expect(screen.getByText("Roles that match responsibility")).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).toContain("Create free account");
    expect(JSON.stringify(screen.toJSON())).toContain("AI disclaimer");
  });

  it("uses one level-one page heading followed by level-two section headings", () => {
    const screen = render(<PublicLandingPage page="home" />);

    expect(
      screen.getByText("One connected path from grow setup to harvest").props[
        "aria-level"
      ]
    ).toBe(1);
    for (const title of ["Personal growers", "Commercial creators", "Facilities"]) {
      expect(screen.getByText(title).props["aria-level"]).toBe(2);
    }
  });

  it("describes course publishing without a creator-support application", () => {
    const pricing = PUBLIC_PAGE_COPY.pricing;

    expect(pricing.intro).toContain(
      "All GrowPathAI users can create and publish free or paid courses"
    );
    const courseCopy = pricing.sections.map((section) => section.body).join(" ");
    expect(courseCopy).toContain("All plans can create and publish courses");
    expect(courseCopy).not.toContain("apply");
    expect(courseCopy).not.toContain("support@growpathai.com");
  });

  it("publishes the exact monthly and yearly amounts for every paid plan", () => {
    const pricingCopy = JSON.stringify(PUBLIC_PAGE_COPY.pricing);

    expect(pricingCopy).toContain("Pro Grower — $10/month or $100/year");
    expect(pricingCopy).toContain("Commercial — $50/month or $500/year");
    expect(pricingCopy).toContain("Facility — $100/month or $1,000/year");
    expect(pricingCopy).toContain("one $1,000 payment");
  });
});
