import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import UpdatesPage, { createUpdatesStyles } from "@/app/updates";
import { PUBLIC_UPDATE_SECTIONS, PUBLIC_UPDATES_REVIEWED } from "@/config/publicUpdates";
import {
  PUBLIC_UPDATE_GROUPS,
  UPDATE_STATUS_LABELS,
  updateGroupSections
} from "@/config/publicUpdateGroups";
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
  it("groups Facility record recovery without claiming all Facility work complete", () => {
    const note = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (entry) => entry.id === "facility-dashboard-readiness"
    );
    expect(note?.summary).toContain("preserves unfinished room forms");
    expect(note?.summary).toContain("task edits and crop choices");
    expect(note?.summary).toContain("Readable tasks remain visible if team choices fail");
    expect(note?.summary).toContain("separate confirmation naming the saved task");
    expect(note?.summary).toContain("Back from a grow's task queue returns to that grow");
    expect(note?.summary).toContain("grow-detail Back opens the grow list");
    expect(note?.summary).toContain("distinguish creation from start dates");
    expect(note?.summary).toContain(
      "Grow-launched Plants, Journal, Inventory and SOP Library"
    );
    expect(note?.summary).toContain("Inventory and SOP Library remain Facility-wide");
    expect(note?.summary).toContain(
      "Dashboard plant counts now recognize the returned plant records"
    );
    expect(note?.summary).toContain("Plants and Journal have visible Refresh/Retry");
    expect(note?.summary).toContain("Inventory and SOP-run lists now distinguish unavailable reads from empty records");
    expect(note?.summary).toContain("do not complete the broader Facility-role review");
  });
  it("never dates the page earlier than its released notes", () => {
    const reviewed = Date.parse(PUBLIC_UPDATES_REVIEWED);
    expect(Number.isFinite(reviewed)).toBe(true);
    for (const entry of PUBLIC_UPDATE_SECTIONS[0].entries) {
      expect(Date.parse(entry.date)).toBeLessThanOrEqual(reviewed);
    }
  });
  it("limits the grouped setup note to readiness and retained inventory evidence", () => {
    const note = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (entry) => entry.id === "commercial-setup-readiness"
    );
    expect(note?.summary).toContain("Retry keeps unfinished forms");
    expect(note?.summary).toContain("unknown totals from zero stock");
    expect(note?.summary).toContain(
      "Calculations, permissions, publication rules and the existing layout stay unchanged"
    );
  });
  it("keeps the Product Trial read-recovery note separate from trial publication", () => {
    const note = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (entry) => entry.id === "commercial-trials-readiness"
    );
    expect(note?.date).toBe("October 2, 2026");
    expect(note?.summary).toContain("Retry keeps your unfinished form");
    expect(note?.summary).toContain(
      "Prices, artwork, publication rules and the existing layout stay unchanged"
    );
  });
  it("limits evidence-run readiness to reading and retrying saved records", () => {
    const note = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (entry) => entry.id === "commercial-evidence-readiness"
    );
    expect(note?.summary).toContain("Retry preserves the unfinished form");
    expect(note?.summary).toContain(
      "publication rules, AI credits and the existing layout stay unchanged"
    );
  });
  it("limits the diagnosis return note to standalone Commercial navigation", () => {
    const note = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (entry) => entry.id === "commercial-diagnosis-return"
    );
    expect(note?.summary).toContain("standalone Commercial Plant Diagnosis");
    expect(note?.summary).toContain("saved-run-linked navigation stays unchanged");
    expect(note?.summary).toContain(
      "No AI execution, credit, permission or layout changes"
    );
  });
  it("limits the task-readiness note to read recovery rather than task execution", () => {
    const note = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (entry) => entry.id === "commercial-tasks-readiness"
    );
    expect(note?.summary).toContain("Retry preserves your unfinished task");
    expect(note?.summary).toContain("separate feedback");
    expect(note?.summary).toContain(
      "Scheduling, completion, task links and the existing layout stay unchanged"
    );
  });
  it("describes the bounded Commercial Analytics presentation correction", () => {
    const note = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (entry) => entry.id === "commercial-analytics-snapshot"
    );
    expect(note?.summary).toContain("previously loaded activity");
    expect(note?.summary).toContain("recorded currencies stay separate");
    expect(note?.summary).toContain(
      "orders, payments, prices and the layout stay unchanged"
    );
  });
  it("keeps the later Lives roadmap after course gifting and out of released work", () => {
    const later = PUBLIC_UPDATE_SECTIONS[PUBLIC_UPDATE_SECTIONS.length - 1];
    expect(later.id).toBe("lives-planned");
    expect(later.description).toContain(
      "after current completion work and course gifting"
    );
    expect(later.description).toContain("not started or available yet");
    expect(later.entries.map((entry) => entry.id)).toEqual([
      "live-native-backstage",
      "live-host-safety",
      "live-creator-growth",
      "live-creator-tips"
    ]);
    for (const entry of later.entries) {
      expect(entry.dateLabel).toBe("Planned for later");
      expect(PUBLIC_UPDATE_SECTIONS[0].entries.map((item) => item.id)).not.toContain(
        entry.id
      );
    }
    const screen = render(<UpdatesPage />);
    fireEvent.press(screen.getByRole("tab", { name: "Future Lives" }));
    fireEvent.press(
      screen.getByRole("button", { name: "Show Future Lives detailed history" })
    );
    expect(screen.getByRole("header", { name: "Lives · Later roadmap" })).toBeTruthy();
    expect(screen.getByText("Support a Live host")).toBeTruthy();
  });

  it("qualifies future tipping and keeps existing production tools", () => {
    const later = PUBLIC_UPDATE_SECTIONS.find(
      (section) => section.id === "lives-planned"
    );
    expect(
      later?.entries.find((entry) => entry.id === "live-native-backstage")?.summary
    ).toContain("does not replace OBS");
    const tips = later?.entries.find(
      (entry) => entry.id === "live-creator-tips"
    )?.summary;
    expect(tips).toContain("Payment-provider eligibility and approval");
    expect(tips).toContain("Tips are not enabled");
    expect(tips).toContain("would not buy giveaway eligibility");
    expect(tips).toContain("No prepaid coins or wallet");
  });

  it("describes campaign recovery without publication or pricing changes", () => {
    const note = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (entry) => entry.id === "campaign-feed-readiness"
    );
    expect(note?.summary).toContain("Retry campaigns");
    expect(note?.summary).toContain("does not publish anything");
    expect(note?.summary).toContain("publishing rules stay unchanged");
  });
  it("shows milestone summaries first and retains dated history within each tab", () => {
    const screen = render(<UpdatesPage />);
    expect(screen.getByRole("header", { name: "Updates" })).toBeTruthy();
    expect(screen.getByText("Last updated October 3, 2026")).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Overview" }).props.accessibilityState.selected
    ).toBe(true);
    for (const group of PUBLIC_UPDATE_GROUPS) {
      expect(screen.getByRole("header", { name: group.title })).toBeTruthy();
      expect(screen.getByText(group.scope)).toBeTruthy();
    }
    expect(screen.queryByText("Larger journal photos and safer retries")).toBeNull();
    expect(screen.getByText(/promise of a release date/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Contact Support" }).props.accessibilityHint
    ).toBe("/support");
    expect(PUBLIC_UPDATE_SECTIONS[0].entries.map((entry) => entry.id)).not.toContain(
      "course-gifting"
    );
    for (const group of PUBLIC_UPDATE_GROUPS) {
      fireEvent.press(screen.getByRole("tab", { name: group.tab }));
      expect(screen.getByText(UPDATE_STATUS_LABELS[group.status])).toBeTruthy();
      expect(screen.getByText(group.next)).toBeTruthy();
      const history = screen.getByRole("button", {
        name: `Show ${group.tab} detailed history`
      });
      expect(history.props.accessibilityState.expanded).toBe(false);
      expect(
        screen.getByRole("tab", { name: group.tab }).props.accessibilityState.selected
      ).toBe(true);
      fireEvent.press(history);
      expect(
        screen.getByRole("button", { name: `Hide ${group.tab} detailed history` }).props
          .accessibilityState.expanded
      ).toBe(true);
      for (const section of updateGroupSections(group)) {
        expect(screen.getByRole("header", { name: section.title })).toBeTruthy();
        for (const entry of section.entries) {
          expect(
            screen.getAllByRole("header", { name: entry.title }).length
          ).toBeGreaterThan(0);
          expect(
            screen.getAllByText(`${entry.dateLabel} ${entry.date}`).length
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it("preserves every existing note exactly once without inventing history", () => {
    const original = PUBLIC_UPDATE_SECTIONS.flatMap((section) =>
      section.entries.map((entry) => entry.id)
    );
    const grouped = PUBLIC_UPDATE_GROUPS.flatMap((group) => group.entryIds);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual([...original].sort());
    expect(new Set(PUBLIC_UPDATE_GROUPS.map((group) => group.id)).size).toBe(
      PUBLIC_UPDATE_GROUPS.length
    );
  });

  it("collapses history when switching groups and supports overview shortcuts", () => {
    const screen = render(<UpdatesPage />);
    fireEvent.press(screen.getByRole("button", { name: "View Courses milestone" }));
    expect(
      screen.getByRole("tab", { name: "Courses" }).props.accessibilityState.selected
    ).toBe(true);
    fireEvent.press(
      screen.getByRole("button", { name: "Show Courses detailed history" })
    );
    expect(screen.getByText(PUBLIC_UPDATE_SECTIONS[0].entries[0].title)).toBeTruthy();
    fireEvent.press(screen.getByRole("tab", { name: "Billing & checkout" }));
    expect(screen.queryByText(PUBLIC_UPDATE_SECTIONS[0].entries[0].title)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Show Billing & checkout detailed history" })
        .props.accessibilityState.expanded
    ).toBe(false);
    fireEvent.press(screen.getByRole("tab", { name: "Courses" }));
    expect(
      screen.getByRole("button", { name: "Show Courses detailed history" }).props
        .accessibilityState.expanded
    ).toBe(false);
  });

  it("does not mark unfinished areas or future additions complete", () => {
    expect(
      PUBLIC_UPDATE_GROUPS.filter((group) => group.status === "complete").map(
        (group) => group.id
      )
    ).toEqual(["journals", "billing", "hosted-live"]);
    for (const id of ["courses", "shopping", "admin"]) {
      expect(PUBLIC_UPDATE_GROUPS.find((group) => group.id === id)?.status).toBe(
        "partial"
      );
    }
    expect(PUBLIC_UPDATE_GROUPS.find((group) => group.id === "app-review")?.status).toBe(
      "progress"
    );
    for (const id of ["course-gifts", "future-lives"]) {
      expect(PUBLIC_UPDATE_GROUPS.find((group) => group.id === id)?.status).toBe(
        "planned"
      );
    }
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
      "course-media-playback-recovery",
      "course-lesson-authoring-guards",
      "course-analytics-readiness",
      "commercial-course-list-readiness",
      "course-builder-source-return",
      "commercial-brand-profile-readiness",
      "commercial-setup-readiness",
      "commercial-trials-readiness",
      "commercial-evidence-readiness",
      "commercial-diagnosis-return",
      "commercial-tasks-readiness",
      "commercial-product-editor-readiness",
      "commercial-products-readiness",
      "commercial-analytics-snapshot",
      "hosted-studio-readiness",
      "marketing-planner-readiness",
      "campaign-feed-readiness",
      "seller-summary-readiness",
      "seller-offers-readiness",
      "commercial-dashboard-readiness",
      "storefront-dashboard-publication",
      "hosted-private-preview-replay",
      "purchased-library-readiness",
      "grow-list-readiness",
      "timeline-export-return",
      "general-crop-calendar-access",
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
      "commerce-refunds-sellers",
      "facility-dashboard-readiness",
      "video-library-readiness",
      "forum-share-readiness",
      "live-directory-readiness"
    ]);
  });

  it("bounds seller Analytics changes to read readiness without promising payouts", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "seller-summary-readiness"
    );
    expect(entry?.summary).toContain("waits for a successful load");
    expect(entry?.summary).toContain("refresh failures keep labeled previous results");
    expect(entry?.summary).toContain("not a payment-date ledger or payout statement");
    expect(entry?.summary).toContain(
      "checkout rules and the existing layout stay unchanged"
    );
    expect(entry?.summary).not.toMatch(/all commerce.*complete|payouts verified/i);
  });

  it("records private-host and signed-out replay proof without claiming the whole app complete", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "hosted-private-preview-replay"
    );
    expect(entry?.summary).toContain("Drafts remain private");
    expect(entry?.summary).toContain("replay played through to the end");
    expect(entry?.summary).toContain("played in a signed-out private browser");
    expect(entry?.summary).toContain("chat still required sign-in");
    expect(entry?.summary).toContain("the broader app review continues");
    expect(entry?.summary).not.toMatch(/all Live.*complete|public broadcast verified/i);
  });

  it("limits the purchased-library note to loading and deliberate read-only recovery", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "purchased-library-readiness"
    );
    expect(entry?.summary).toContain("confirmed-empty results stay separate");
    expect(entry?.summary).toContain("Retrying does not buy or download anything");
    expect(entry?.summary).toContain(
      "Existing purchases, payment rules, authorized downloads"
    );
  });

  it("separates unavailable grow data from real account limits and earlier New Grow work", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "grow-list-readiness"
    );
    expect(entry?.summary).toContain("successfully loaded records");
    expect(entry?.summary).toContain("Existing grow limits, permissions");
    const photoEntry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "journal-large-photo-upload"
    );
    expect(photoEntry?.summary).toContain("New Grow screen");
    expect(photoEntry?.summary).toContain("separate grow-list display correction");
  });

  it("describes the Personal timeline export return without claiming new export capability", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "timeline-export-return"
    );
    expect(entry?.summary).toContain("Personal grow");
    expect(entry?.summary).toContain("export is locked by your plan");
    expect(entry?.summary).toContain(
      "published shares, and the existing layout stay unchanged"
    );
    expect(entry?.summary).not.toMatch(/unlocks|all exports.*verified/i);
  });

  it("describes only the crop-calendar access correction", () => {
    const entry = PUBLIC_UPDATE_SECTIONS[0].entries.find(
      (item) => item.id === "general-crop-calendar-access"
    );
    expect(entry?.summary).toContain("The selected grow stays attached");
    expect(entry?.summary).toContain("opening the planner does not generate tasks");
    expect(entry?.summary).not.toMatch(/all growers.*verified|all.*complete/i);
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
      expect(styles.tabs.flexWrap).toBe("wrap");
      expect(styles.tab.minHeight).toBeGreaterThanOrEqual(44);
      expect(styles.selectedTabText.color).toBe(palette.accentText);
    }
  );

  it("contains no private account, provider, credential, or audit identifiers", () => {
    expect(JSON.stringify([PUBLIC_UPDATE_SECTIONS, PUBLIC_UPDATE_GROUPS])).not.toMatch(
      /@|qa\.invalid|cs_live_|cs_test_|acct_|cus_|whsec_|sk_live_|srv-|mongodb|vault|audit record|Erick|jcind|DPAPI|registryId|\b[a-f0-9]{24}\b/i
    );
  });
});
