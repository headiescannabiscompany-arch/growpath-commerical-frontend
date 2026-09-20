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
    expect(screen.getByText("Last updated September 19, 2026")).toBeTruthy();
    expect(screen.getByText("Visual grow stories and journal photos")).toBeTruthy();
    expect(screen.getByText("Complete missing age information in Profile")).toBeTruthy();
    expect(
      screen.getByText("No additional updates are currently listed as in testing.")
    ).toBeTruthy();
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
      "account-admin-controls",
      "complimentary-access-live-gifts",
      "admin-safety-review",
      "course-gifting"
    ]);
    expect(PUBLIC_UPDATE_SECTIONS[1].entries).toEqual([]);
    expect(PUBLIC_UPDATE_SECTIONS[0].entries.map((entry) => entry.id)).toEqual([
      "timeline-photos-sharing",
      "profile-age-confirmation",
      "subscription-checkout",
      "facility-billing",
      "commerce-checkout",
      "commerce-refunds-sellers"
    ]);
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
      /@|qa\.invalid|cs_live_|cs_test_|acct_|cus_|whsec_|sk_live_|srv-|mongodb|vault|audit record/i
    );
  });
});
