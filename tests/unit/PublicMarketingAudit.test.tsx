import React from "react";
import { render } from "@testing-library/react-native";
import { AppState } from "react-native";
import PublicLandingPage from "@/components/marketing/PublicLandingPage";
import marketing from "@/components/marketing/publicMarketing.json";
import { PLAN_LIMITS } from "@/config/planLimits";
import { FREE_POLICY } from "@/config/freePolicy";
import { getPublicTestimonials } from "@/api/testimonials";
import PublicTestimonials from "@/components/marketing/PublicTestimonials";
import { Link } from "expo-router";

jest.mock("@/api/testimonials", () => ({
  getPublicTestimonials: jest.fn(() => new Promise(() => {}))
}));

describe("HeyCatch audit corrections", () => {
  it.each(["home", "about"] as const)(
    "shows the supplied founder profile without tracking parameters on %s",
    (page) => {
      const screen = render(<PublicLandingPage page={page} />);
      const links = screen
        .UNSAFE_getAllByType(Link)
        .filter((link) => link.props.href === marketing.founder.socialUrl);
      expect(links).toHaveLength(1);
      expect(links[0].props.children).toBe("Jay on LinkedIn");
      expect(links[0].props.href).not.toContain("?");
    }
  );
  it("keeps the existing headline and states the repeatable-result benefit", () => {
    expect(marketing.pages.home.title).toBe("The grow journal that remembers every run.");
    expect(marketing.pages.home.intro).toContain(
      "repeat what worked — the way serious growers do"
    );
  });
  it("links reviewed output from Pro pricing and the payments FAQ without a refund promise", () => {
    const screen = render(<PublicLandingPage page="pricing" />);
    const previewLinks = screen
      .UNSAFE_getAllByType(Link)
      .filter((link) => link.props.href === "/demo?story=pro");
    expect(previewLinks).toHaveLength(2);
    expect(previewLinks[0].props.children).toBe(
      "Preview a history answer and grow comparison — no signup"
    );
    expect(screen.getAllByText(/Actual app output using synthetic records/)).toHaveLength(
      2
    );
    expect(JSON.stringify(screen.toJSON())).toContain(
      "we do not promise an unconditional money-back guarantee"
    );
  });
  it("names Facility fragmentation without promising a compliance replacement", () => {
    for (const page of ["home", "facility-management"] as const) {
      const screen = render(<PublicLandingPage page={page} />);
      expect(screen.getByText(/Compliance records.*METRC/)).toBeTruthy();
      expect(JSON.stringify(screen.toJSON())).toContain(
        "does not replace your required compliance system"
      );
      screen.unmount();
    }
  });
  it.each(["home", "personal-grower", "pricing", "about"] as const)(
    "reuses one dynamic, empty-by-default feedback surface on %s",
    (page) => {
      const screen = render(<PublicLandingPage page={page} />);
      expect(screen.UNSAFE_getAllByType(PublicTestimonials)).toHaveLength(1);
      expect(screen.queryByText("Feedback from growers")).toBeNull();
      expect(screen.queryByText("Most popular")).toBeNull();
    }
  );
  it("anchors Pro against a user's own tool spend without an invented saving", () => {
    const screen = render(<PublicLandingPage page="pricing" />);
    expect(screen.getByText(marketing.pricingAlternativeAnchor)).toBeTruthy();
    expect(marketing.pricingAlternativeAnchor).toContain("Your savings depend");
  });
  beforeEach(() => {
    jest.mocked(getPublicTestimonials).mockImplementation(() => new Promise(() => {}));
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation(() => ({ remove: jest.fn() }));
  });

  it("preserves the founder's book-first origin and distinguishes inspiration from implementation", () => {
    const screen = render(<PublicLandingPage page="about" />);
    expect(screen.getByText(marketing.founder.historyNote)).toBeTruthy();
    for (const section of marketing.founder.historySections) {
      expect(screen.getByText(section.title)).toBeTruthy();
      expect(screen.getByText(section.body)).toBeTruthy();
    }
    const copy = JSON.stringify(screen.toJSON());
    expect(copy).toContain("idea of a choose-your-own-adventure book");
    expect(copy).toContain("I may have had the original concept earlier");
    expect(copy).toContain("Jorge Cervantes");
    expect(copy).toContain("it does not use his framework");
  });

  it("uses a personal-grower hero and scope limits without outcome promises", () => {
    const screen = render(<PublicLandingPage page="home" />);
    expect(screen.getByText("The grow journal that remembers every run.")).toBeTruthy();
    expect(
      screen.getByText(
        "Free account. No payment card required. Your content stays yours."
      )
    ).toBeTruthy();
    expect(screen.getByText(marketing.scope)).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).toContain("Explore the grow journal");
  });
  it("keeps published allowances aligned with existing plan limits", () => {
    for (const p of marketing.plans) {
      const plan = PLAN_LIMITS[p.id as "free" | "pro" | "commercial" | "facility"];
      expect(p.grows).toBe(plan.maxGrows);
      expect(p.plants).toBe(plan.maxPlants);
      expect(p.paidCourses).toBe(plan.maxPaidCourses);
      expect(p.lessons).toBe(plan.maxLessonsPerCourse);
      expect(p.annual).toBe(p.monthly * 10);
    }
    expect(marketing.plans[0].credits).toBe(FREE_POLICY.aiCreditsPerWeek);
  });
  it("shows pricing FAQs and a recommendation, never invented popularity", () => {
    const screen = render(<PublicLandingPage page="pricing" />);
    for (const f of marketing.pricingFaq) expect(screen.getByText(f.title)).toBeTruthy();
    expect(screen.getByText("Recommended for growing beyond Free")).toBeTruthy();
    expect(screen.queryByText("Most popular")).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toContain("unlimited AI");
  });
  it("links only the owner-provided founder channel and withholds missing proof", () => {
    const screen = render(<PublicLandingPage page="about" />);
    expect(JSON.stringify(screen.toJSON())).toContain(
      "Watch Exploring the Growing Universe on YouTube"
    );
    expect(marketing.founder.showUrl).toBe("https://youtube.com/@etgujay");
    expect(marketing.founder.photo).toBe("/images/founder-jay.jpg");
    expect(marketing.founder.photoAlt).toBe("Jay, founder of GrowPathAI");
    expect(screen.getByText(marketing.founder.story)).toBeTruthy();
    expect(marketing.founder.socialUrl).toBe(
      "https://www.linkedin.com/in/johnabrahamcollins1979"
    );
    expect(JSON.stringify(screen.toJSON())).toContain("Jay on LinkedIn");
    expect(marketing.proof.stories).toEqual([]);
    expect(marketing.proof.verifiedGrowerCount).toBeNull();
  });
  it.each(["vs/plntrk", "vs/grow-with-jane"] as const)(
    "offers source-linked comparisons at %s",
    (page) => {
      const screen = render(<PublicLandingPage page={page} />);
      expect(screen.getByText(marketing.pages[page].title)).toBeTruthy();
      expect(
        marketing.pages[page].sections.some((s) => s.href.startsWith("https://"))
      ).toBe(true);
    }
  );
});
