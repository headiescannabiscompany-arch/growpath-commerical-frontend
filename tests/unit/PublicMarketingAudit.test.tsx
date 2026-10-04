import React from "react";
import { render } from "@testing-library/react-native";
import PublicLandingPage from "@/components/marketing/PublicLandingPage";
import marketing from "@/components/marketing/publicMarketing.json";
import { PLAN_LIMITS } from "@/config/planLimits";
import { FREE_POLICY } from "@/config/freePolicy";

describe("HeyCatch audit corrections", () => {
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
    expect(marketing.founder.socialUrl).toBeNull();
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
