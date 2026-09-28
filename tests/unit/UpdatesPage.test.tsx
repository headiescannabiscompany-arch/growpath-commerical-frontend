import React from "react";
import { render } from "@testing-library/react-native";
import UpdatesPage, { createUpdatesStyles } from "@/app/updates";
import { PUBLIC_UPDATE_SECTIONS } from "@/config/publicUpdates";
import { getThemePalette } from "@/theme/appTheme";
import { getRoutePolicy } from "@/navigation/routeAccess";
import { metadataForPathname } from "@/seo/publicRouteMetadata";

jest.mock("expo-router", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => {
    const { Text } = require("react-native");
    return (
      <Text accessibilityRole="link" accessibilityHint={href}>
        {children}
      </Text>
    );
  },
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, replace: jest.fn() })
}));

describe("public Updates page", () => {
  it("distinguishes released work, testing, and plans with readable fixed dates", () => {
    const screen = render(<UpdatesPage />);
    expect(screen.getByRole("header", { name: "Updates" })).toBeTruthy();
    for (const section of PUBLIC_UPDATE_SECTIONS) {
      expect(screen.getByRole("header", { name: section.title })).toBeTruthy();
    }
    expect(screen.getByText("Last updated September 28, 2026")).toBeTruthy();
    expect(
      screen.getByText("Live subscription gift announcements verified")
    ).toBeTruthy();
    expect(screen.getByText("Larger journal photos and safer retries")).toBeTruthy();
    expect(screen.getByText("Timeline headings that fit on phones")).toBeTruthy();
    expect(screen.getByText("Account management and complimentary access")).toBeTruthy();
    expect(screen.getByText("Cleaner grow and journal creation")).toBeTruthy();
    expect(screen.getByText("Visual grow stories and journal photos")).toBeTruthy();
    expect(screen.getByText("Complete missing age information in Profile")).toBeTruthy();
    expect(
      screen.getByText("Updates in progress · Development and testing")
    ).toBeTruthy();
    expect(
      screen.queryByText("No additional updates are currently listed as in testing.")
    ).toBeNull();
    expect(screen.getByText(/not a promise of a release date/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Contact Support" }).props.accessibilityHint
    ).toBe("/support");
    expect(PUBLIC_UPDATE_SECTIONS[0].entries.map((entry) => entry.id)).not.toContain(
      "course-gifting"
    );
  });

  it("is public without requiring an entitlement and has public metadata", () => {
    expect(getRoutePolicy("/updates")).toBeNull();
    expect(metadataForPathname("/updates")).toMatchObject({
      title: "Updates | GrowPathAI",
      index: true
    });
  });

  it("includes the remaining public work without presenting it as released", () => {
    expect(PUBLIC_UPDATE_SECTIONS[2].entries.map((entry) => entry.id)).toEqual([
      "timeline-improvements",
      "store-discovery-review",
      "course-gifting"
    ]);
    expect(PUBLIC_UPDATE_SECTIONS[1].entries.map((entry) => entry.id)).toEqual([
      "recovery-release",
      "admin-passkey-protection",
      "final-web-acceptance"
    ]);
    expect(PUBLIC_UPDATE_SECTIONS[0].entries.map((entry) => entry.id)).toEqual([
      "live-gift-follow-up",
      "product-checkout-request-safety",
      "course-loading-readiness",
      "free-course-signup-return",
      "product-description-display",
      "discover-product-destinations",
      "product-interest-signin-return",
      "free-product-signup-return",
      "course-discovery-signin",
      "product-buy-signin-return",
      "product-line-safety",
      "store-directory-recovery",
      "shopping-browse-paths",
      "journal-large-photo-upload",
      "account-admin-controls",
      "admin-case-management",
      "timeline-mobile-heading",
      "grow-journal-completion",
      "timeline-photos-sharing",
      "profile-age-confirmation",
      "subscription-checkout",
      "facility-billing",
      "commerce-checkout",
      "commerce-refunds-sellers"
    ]);
  });

  it("labels Live gift verification as a bounded Sandbox check, not a payment rollout", () => {
    expect(PUBLIC_UPDATE_SECTIONS[0].title).toBe("Recent updates");
    expect(PUBLIC_UPDATE_SECTIONS[0].description).toBe(
      "Released changes and completed checks. Each note states its scope."
    );
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "live-gift-follow-up"
    );
    expect(entry?.dateLabel).toBe("Sandbox check completed");
    expect(entry?.summary).toMatch(/one announcement visible to host and viewer/);
    expect(entry?.summary).toMatch(
      /retained after reload without exposing recipient details/
    );
    expect(entry?.summary).toMatch(/No real money moved/);
    expect(entry?.summary).toMatch(/existing payment and claim behavior is unchanged/);
    expect(entry?.summary).toMatch(
      /Broadcast-provider and outside-picker checks remain separate/
    );
    expect(entry?.summary).toMatch(/course gifting remains planned/);
    expect(entry?.summary).not.toMatch(
      /new payment rollout|all Live.*complete|production payment verified/i
    );
  });

  it("bounds checkout safety to client request handling without availability promises", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "product-checkout-request-safety"
    );
    expect(entry?.summary).toMatch(/overlapping checkout requests on the same page/);
    expect(entry?.summary).toMatch(/cannot open checkout or replace current feedback/);
    expect(entry?.summary).toMatch(/deliberate retry after the request finishes/);
    expect(entry?.summary).toMatch(
      /does not cancel an existing checkout or claim stock is available/
    );
    expect(entry?.summary).not.toMatch(
      /duplicate charges|guarantee|all shopping.*complete/i
    );
  });

  it("identifies the next task without claiming unfinished security work is live", () => {
    const underway = PUBLIC_UPDATE_SECTIONS[1].entries;
    expect(underway[0].summary).toMatch(
      /passed automated checks and staging verification/
    );
    expect(underway[0].summary).toMatch(/remain unfinished/);
    expect(underway[0].summary).toMatch(/Staging success is not a live release/);
    expect(
      underway.find((entry) => entry.id === "admin-passkey-protection")?.summary
    ).toMatch(/two-person access acceptance are not yet complete/);
    expect(
      underway.find((entry) => entry.id === "final-web-acceptance")?.summary
    ).toMatch(/broader review and final operational checks remain in progress/);
    const ids = PUBLIC_UPDATE_SECTIONS.flatMap((section) =>
      section.entries.map((entry) => entry.id)
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps unverified date and sharing follow-ups separate from live fixes", () => {
    const live = JSON.stringify(PUBLIC_UPDATE_SECTIONS[0].entries);
    const planned = PUBLIC_UPDATE_SECTIONS[2].entries.find(
      (entry) => entry.id === "timeline-improvements"
    );
    expect(live).toMatch(/Facebook preview was verified live/);
    expect(live).toMatch(/published snapshot/);
    expect(live).not.toMatch(/calendar-date|all platforms|identity verified/i);
    expect(planned?.summary).toMatch(/Investigate reported calendar-date mismatches/);
    expect(planned?.summary).toMatch(/separate from the released/);
  });

  it("bounds interest sign-in claims to the two released public product surfaces", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "product-interest-signin-return"
    );
    expect(entry?.summary).toMatch(/storefront cards and product details/);
    expect(entry?.summary).toMatch(
      /never records an answer or makes a purchase automatically/
    );
    expect(entry?.summary).toMatch(
      /Discover's product links are listed in their own release note/
    );
  });

  it("limits description changes to duplicate display without changing saved information", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "product-description-display"
    );
    expect(entry?.summary).toMatch(
      /identical description and short-description text only once/
    );
    expect(entry?.summary).toMatch(
      /Different text remains visible in its original order/
    );
    expect(entry?.summary).toMatch(
      /Saved product information, sharing, purchase-interest controls and checkout stay unchanged/
    );
  });

  it("bounds course loading claims without promising broader access", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "course-loading-readiness"
    );
    expect(entry?.summary).toMatch(/wait for sign-in and access checks/);
    expect(entry?.summary).toMatch(
      /Failed access checks show a separate recovery message/
    );
    expect(entry?.summary).toMatch(
      /permissions, enrollment and payment rules stay unchanged/
    );
  });

  it("bounds Discover navigation claims without changing trials or transactions", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "discover-product-destinations"
    );
    expect(entry?.summary).toMatch(/same saved product address/);
    expect(entry?.summary).toMatch(/catalog or plain sign-in/);
    expect(entry?.summary).toMatch(
      /Trial links and the existing browsing layout stay unchanged/
    );
    expect(entry?.summary).toMatch(/never submits interest or starts a purchase/);
  });

  it("bounds Free product signup claims to the same browser without transactions", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "free-product-signup-return"
    );
    expect(entry?.summary).toMatch(/same browser for up to one hour/);
    expect(entry?.summary).toMatch(/never purchases or records interest automatically/);
    expect(entry?.summary).toMatch(/Other browsers and paid-plan signup remain separate/);
    expect(entry?.summary).toMatch(/Course signup is covered in its own release note/);
    expect(
      PUBLIC_UPDATE_SECTIONS[0].entries.find(
        (item) => item.id === "product-buy-signin-return"
      )?.summary
    ).not.toMatch(/New-account verification remains a separate follow-up/);
  });

  it("limits course release wording to discovery and existing-account continuation", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "course-discovery-signin"
    );
    expect(entry?.summary).toMatch(/public previews/);
    expect(entry?.summary).toMatch(/without automatically enrolling or opening checkout/);
    expect(entry?.summary).toMatch(/course gifting remains separate work/);
    expect(entry?.summary).toMatch(
      /Free-account course signup is covered in its own release note/
    );
  });

  it("bounds course signup to the same browser without promising paid access", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "free-course-signup-return"
    );
    expect(entry?.summary).toMatch(/Free-account signup/);
    expect(entry?.summary).toMatch(/same browser for up to one hour/);
    expect(entry?.summary).toMatch(/matching sign-in/);
    expect(entry?.summary).toMatch(
      /never enrolls, purchases or unlocks paid lessons automatically/
    );
    expect(entry?.summary).toMatch(
      /Other browsers, paid-plan signup and course gifting remain separate work/
    );
  });

  it.each(["day", "night"] as const)(
    "uses the existing %s palette and responsive width",
    (mode) => {
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const styles = createUpdatesStyles(palette);
      expect(styles.root.backgroundColor).toBe(palette.page);
      expect(styles.card.backgroundColor).toBe(palette.surface);
      expect(styles.title.color).toBe(palette.text);
      expect(styles.body.color).toBe(palette.textSoft);
      expect(styles.link.color).toBe(palette.link);
      expect(styles.content.width).toBe("100%");
      expect(styles.content.maxWidth).toBe(920);
    }
  );

  it("contains no private account, provider, credential, or audit identifiers", () => {
    expect(JSON.stringify(PUBLIC_UPDATE_SECTIONS)).not.toMatch(
      /@|qa\.invalid|cs_live_|cs_test_|acct_|cus_|whsec_|sk_live_|srv-|mongodb|vault|audit record|Erick|jcind|DPAPI|registryId|\b[a-f0-9]{24}\b/i
    );
  });
});
