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

  it("keeps the approved creator publishing policy on the pricing page", () => {
    const pricing = PUBLIC_PAGE_COPY.pricing;

    expect(pricing.intro).toContain(
      "All GrowPathAI users can create and publish free or paid courses"
    );
    expect(pricing.sections.map((section) => section.body).join(" ")).toContain(
      "support@growpathai.com"
    );
  });
});
