import React from "react";
import { render } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";
import { Link } from "expo-router";
import PublicLandingPage, {
  PUBLIC_PAGE_COPY,
  createPublicLandingStyles,
  usesCompactPublicLayout
} from "@/components/marketing/PublicLandingPage";
import { getThemePalette } from "@/theme/appTheme";
import marketing from "@/components/marketing/publicMarketing.json";

describe("PublicLandingPage", () => {
  it("renders crawl-aligned facility workflow copy and public navigation", () => {
    const screen = render(<PublicLandingPage page="facility-management" />);

    expect(screen.getByText("Facility → Room → Grow → Plant")).toBeTruthy();
    expect(screen.getByText("Roles that match responsibility")).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).toContain("Store");
    expect(JSON.stringify(screen.toJSON())).toContain("Create free account");
    expect(JSON.stringify(screen.toJSON())).toContain("AI disclaimer");
  });

  it("uses the compact public layout only below the mobile breakpoint", () => {
    expect(usesCompactPublicLayout(320)).toBe(true);
    expect(usesCompactPublicLayout(599)).toBe(true);
    expect(usesCompactPublicLayout(600)).toBe(false);
  });

  it("uses one level-one page heading followed by level-two section headings", () => {
    const screen = render(<PublicLandingPage page="home" />);

    expect(
      screen.getByText("The grow journal that remembers every run.").props["aria-level"]
    ).toBe(1);
    for (const title of ["Personal growers", "Commercial creators", "Facilities"]) {
      expect(screen.getByText(title).props["aria-level"]).toBe(2);
    }
  });

  it.each([
    ["Day", getThemePalette("day", "light")],
    ["Night", getThemePalette("night", "dark")]
  ])(
    "uses the active %s palette across public navigation, hero, actions, cards, and footer",
    (_label, palette) => {
      const styles = createPublicLandingStyles(palette);

      expect(styles.page.backgroundColor).toBe(palette.page);
      expect(styles.brand.color).toBe(palette.text);
      expect(styles.link.color).toBe(palette.link);
      expect(styles.hero.backgroundColor).toBe(palette.hero);
      expect(styles.eyebrow.color).toBe(palette.heroMuted);
      expect(styles.title.color).toBe(palette.heroText);
      expect(styles.intro.color).toBe(palette.heroMuted);
      expect(styles.primary).toEqual(
        expect.objectContaining({
          backgroundColor: palette.accent,
          color: palette.accentText
        })
      );
      expect(styles.secondary).toEqual(
        expect.objectContaining({
          borderColor: palette.accent,
          color: palette.link
        })
      );
      expect(styles.card).toEqual(
        expect.objectContaining({
          backgroundColor: palette.card,
          borderColor: palette.border
        })
      );
      expect(styles.cardTitle.color).toBe(palette.text);
      expect(styles.cardBody.color).toBe(palette.textMuted);
      expect(styles.footer.borderTopColor).toBe(palette.border);
    }
  );

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

  it.each(["web", "ios"] as const)(
    "shows the supplied founder portrait with its accessible description on %s",
    (platform) => {
      const platformOverride = jest.replaceProperty(Platform, "OS", platform);
      try {
        const screen = render(<PublicLandingPage page="about" />);
        const portrait = screen.getByLabelText("Jay, founder of GrowPathAI");

        expect(portrait.props.source).toEqual({
          uri:
            platform === "web"
              ? "/images/founder-jay.jpg"
              : "https://growpathai.com/images/founder-jay.jpg"
        });
        expect(portrait.props.alt).toBe("Jay, founder of GrowPathAI");
        expect(StyleSheet.flatten(portrait.props.style)).toEqual(
          expect.objectContaining({ width: 192, height: 240, maxWidth: "100%" })
        );
        expect(portrait.props.resizeMode).toBe("contain");
        expect(screen.getByText("Meet Jay")).toBeTruthy();
      } finally {
        platformOverride.restore();
      }
    }
  );

  it("puts a single founder introduction near the homepage footer without changing the hero", () => {
    const screen = render(<PublicLandingPage page="home" />);
    const mention = "Built by Jay, host of Exploring the Growing Universe.";
    const rendered = JSON.stringify(screen.toJSON());

    expect(screen.getAllByText(mention)).toHaveLength(1);
    expect(rendered).toContain("Watch the show on YouTube");
    expect(screen.queryByLabelText("Jay, founder of GrowPathAI")).toBeNull();
    expect(rendered.indexOf(mention)).toBeGreaterThan(
      rendered.indexOf("Your records, your decisions")
    );
    expect(rendered.indexOf(mention)).toBeLessThan(
      rendered.indexOf("See what has actually shipped")
    );
    expect(screen.getByText("The grow journal that remembers every run.")).toBeTruthy();
  });

  it("explains Pro value at its actual grow limit and shared Facility pricing", () => {
    const screen = render(<PublicLandingPage page="pricing" />);
    const anchor =
      "At the 10-grow plan limit, $10/month works out to $1 per tracked grow per month.";

    expect(marketing.pricingValueAnchor).toBe(anchor);
    expect(screen.getAllByText(anchor)).toHaveLength(1);
    expect(screen.getByText(PUBLIC_PAGE_COPY.pricing.intro)).toBeTruthy();
    expect(PUBLIC_PAGE_COPY.pricing.intro).toContain(
      "Priced by what you do, not per seat: one Facility subscription covers its team workspace, with shared plan limits."
    );
    const pro = marketing.plans.find((plan) => plan.id === "pro");
    expect(pro).toEqual(expect.objectContaining({ monthly: 10, grows: 10 }));
    expect(pro!.monthly / pro!.grows).toBe(1);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(
      /cost of nutrients|nutrient cost/i
    );
  });

  it.each(["home", "personal-grower"] as const)(
    "makes the photo-feed scope limit explicit on %s",
    (page) => {
      const screen = render(<PublicLandingPage page={page} />);
      expect(screen.getByText(marketing.scope)).toBeTruthy();
      expect(marketing.scope).toContain(
        "If you only want a photo feed for bud shots, this is probably more structure than you need."
      );
    }
  );

  it("adds the real founder asset without fabricating missing stories or social proof", () => {
    expect(marketing.founder.photo).toBe("/images/founder-jay.jpg");
    expect(marketing.founder.showUrl).toBe("https://youtube.com/@etgujay");
    expect(marketing.founder.story).toBeNull();
    expect(marketing.founder.socialUrl).toBeNull();
    expect(marketing.proof).toEqual({
      verifiedGrowerCount: null,
      stories: [],
      thirdPartyMentions: [],
      screenshots: []
    });
  });

  it.each(["vs/growtrackr", "grow-journal-app"] as const)(
    "renders the shared public copy for %s with a single main heading",
    (page) => {
      const screen = render(<PublicLandingPage page={page} />);
      const copy = PUBLIC_PAGE_COPY[page];
      const headings = screen.getAllByRole("header");

      expect(
        headings.filter((heading) => heading.props["aria-level"] === 1)
      ).toHaveLength(1);
      expect(screen.getByText(copy.title).props["aria-level"]).toBe(1);
      expect(screen.getByText(copy.intro)).toBeTruthy();
      for (const section of copy.sections) {
        expect(screen.getByText(section.title).props["aria-level"]).toBe(2);
        expect(screen.getByText(section.body)).toBeTruthy();
      }
      const links = screen.UNSAFE_getAllByType(Link);
      expect(links.some((link) => link.props.href === "/register")).toBe(true);
      expect(links.some((link) => link.props.href === "/pricing")).toBe(true);
    }
  );

  it("links both new public pages from the existing footer", () => {
    const screen = render(<PublicLandingPage page="home" />);
    const links = screen.UNSAFE_getAllByType(Link);

    for (const [href, label] of [
      ["/vs/growtrackr", "Compare GrowTrackr"],
      ["/grow-journal-app", "Grow journal app"]
    ]) {
      const matches = links.filter((link) => link.props.href === href);
      expect(matches).toHaveLength(1);
      expect(matches[0].props.children).toBe(label);
    }
  });

  it.each([390, 1024])(
    "keeps navigation and CTA tap targets at least 44px at %spx",
    (width) => {
      const dimensions = jest
        .spyOn(require("react-native"), "useWindowDimensions")
        .mockReturnValue({
          width,
          height: 844,
          scale: 1,
          fontScale: 1
        });
      try {
        const screen = render(<PublicLandingPage page="home" />);
        const links = screen.UNSAFE_getAllByType(Link);
        for (const label of [
          "GrowPathAI",
          "Features",
          "Pricing",
          "Store",
          "Courses",
          "Forum",
          "Sign in",
          "Create free account",
          "Explore features",
          "Compare GrowTrackr",
          "Grow journal app"
        ]) {
          const matches = links.filter((link) => link.props.children === label);
          expect(matches.length).toBeGreaterThan(0);
          for (const link of matches)
            expect(StyleSheet.flatten(link.props.style).minHeight).toBeGreaterThanOrEqual(
              44
            );
        }
        const actions = links.filter((link) =>
          ["Create free account", "Explore features"].includes(link.props.children)
        );
        if (width < 600)
          for (const action of actions)
            expect(StyleSheet.flatten(action.props.style).width).toBe("100%");
      } finally {
        dimensions.mockRestore();
      }
    }
  );
});
