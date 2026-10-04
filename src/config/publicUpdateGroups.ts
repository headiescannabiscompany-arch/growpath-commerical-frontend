import { PUBLIC_UPDATE_SECTIONS } from "./publicUpdates";

// Curated public milestones, not a projection of the private operational TODO.
// Keep stable group IDs. Add small release receipts to the relevant group's
// history; update its summary at a substantial release or scoped completion.
export type UpdateGroup = {
  id: string;
  tab: string;
  title: string;
  status: "complete" | "partial" | "progress" | "planned";
  scope: string;
  live: string;
  next: string;
  entryIds: string[];
};

export const UPDATE_STATUS_LABELS = {
  complete: "100% complete · milestone live",
  partial: "Partially live · work continues",
  progress: "In progress",
  planned: "Planned · not released"
};

export const PUBLIC_UPDATE_GROUPS: UpdateGroup[] = [
  {
    id: "public-website",
    tab: "Website & plans",
    title: "Clearer public pages and plan information",
    status: "partial",
    scope:
      "Grower-focused explanations, exact plan allowances and search-readable public pages.",
    live: "The website explains grow journals first, compares the four plans with weekly AI credits, answers export and billing questions, and links source-checked product comparisons. Public pages have their own search metadata.",
    next: "Add reviewed product screenshots, a founder portrait and permissioned grower stories. These proof items are not presented as completed or invented.",
    entryIds: ["public-website-audit"]
  },
  {
    id: "courses",
    tab: "Courses",
    title: "Course authoring and learning",
    status: "partial",
    scope: "Reliable course discovery, authoring, lesson media and learner journeys.",
    live: "Course discovery and sign-in returns, saved lesson editing safeguards, video switching and Retry, course-list recovery, analytics and builder navigation are live.",
    next: "Remaining author and learner journey checks, including resource and discussion handoffs where suitable test records are available. Course gifting is a separate planned milestone.",
    entryIds: [
      "course-media-playback-recovery",
      "course-lesson-authoring-guards",
      "course-analytics-readiness",
      "commercial-course-list-readiness",
      "course-builder-source-return",
      "course-loading-readiness",
      "free-course-signup-return",
      "course-discovery-signin"
    ]
  },
  {
    id: "shopping",
    tab: "Stores & shopping",
    title: "Shopping and seller workspaces",
    status: "partial",
    scope:
      "Finding products, returning to stores and using the existing Commercial tools.",
    live: "Product browsing controls, searchable catalogs, full-store links, safer editing and checkout requests are live. Seller offers, orders-related summaries, dashboards, analytics, tasks and saved-record pages have clearer loading and recovery.",
    next: "Finish the remaining shopper and seller journey review and campaign-copy consistency. Further design changes will be reviewed separately; existing artwork, prices and purchase rules stay unchanged.",
    entryIds: [
      "commercial-brand-profile-readiness",
      "commercial-setup-readiness",
      "commercial-trials-readiness",
      "commercial-evidence-readiness",
      "commercial-diagnosis-return",
      "commercial-tasks-readiness",
      "commercial-product-editor-readiness",
      "commercial-products-readiness",
      "commercial-analytics-snapshot",
      "marketing-planner-readiness",
      "campaign-feed-readiness",
      "seller-summary-readiness",
      "seller-offers-readiness",
      "commercial-dashboard-readiness",
      "storefront-dashboard-publication",
      "purchased-library-readiness",
      "product-checkout-request-safety",
      "product-description-display",
      "discover-product-destinations",
      "product-interest-signin-return",
      "free-product-signup-return",
      "product-buy-signin-return",
      "product-line-safety",
      "store-directory-recovery",
      "shopping-browse-paths",
      "store-discovery-review"
    ]
  },
  {
    id: "journals",
    tab: "Grows & journals",
    title: "Grow journals and visual timeline fixes",
    status: "complete",
    scope:
      "The released photo, timeline-sharing, creation and grow-navigation fixes—not every future timeline enhancement.",
    live: "Larger journal-photo handling, adding photos to older entries, clearer grow limits, duplicate-looking timeline cleanup, visual multi-point/photo sharing, phone headings and safe return paths are live.",
    next: "Separate follow-ups remain for reported date mismatches, longer timelines and additional sharing destinations. They do not reopen the completed fixes above.",
    entryIds: [
      "grow-list-readiness",
      "timeline-export-return",
      "general-crop-calendar-access",
      "journal-large-photo-upload",
      "timeline-mobile-heading",
      "grow-journal-completion",
      "timeline-photos-sharing",
      "profile-age-confirmation",
      "timeline-improvements"
    ]
  },
  {
    id: "billing",
    tab: "Billing & checkout",
    title: "Billing and purchase-flow release",
    status: "complete",
    scope:
      "The accepted subscription, workspace billing, checkout/recovery and purchase/refund release.",
    live: "Subscription and Facility checkout, purchase recovery, protected digital delivery and refund/seller-allocation handling are released. Financial test notes retain their original limits.",
    next: "Sandbox acceptance does not certify a real bank payout or every future payment use. Course gifting, creator tips and other separately gated commerce additions are not included in this completed milestone.",
    entryIds: [
      "subscription-checkout",
      "facility-billing",
      "commerce-checkout",
      "commerce-refunds-sellers"
    ]
  },
  {
    id: "admin",
    tab: "Admin & recovery",
    title: "Admin safety and recovery",
    status: "partial",
    scope:
      "Account-management, complimentary access, private case controls and stronger recovery protection.",
    live: "Account-management and complimentary-access controls, private case-management tools and passkey setup are available. Completed synthetic checks remain recorded as completed.",
    next: "Independent administrator acceptance, two-person sensitive-access checks and production recovery integration and verification remain unfinished. Tested recovery code is not a production activation.",
    entryIds: [
      "account-admin-controls",
      "admin-case-management",
      "recovery-release",
      "admin-passkey-protection"
    ]
  },
  {
    id: "hosted-live",
    tab: "Hosted Live",
    title: "Hosted Live playback and replay",
    status: "complete",
    scope:
      "The existing hosted transport, private-preview, stop/replay and readiness fixes.",
    live: "Private host previews and replay status are live. Production synthetic replay checks passed for the host and a signed-out viewer; chat still requires sign-in. Studio readiness and Retry are also released.",
    next: "This is not event-capacity certification or a native guest studio. Creators still use OBS, Camo or their chosen production tools. Backstage and creator-support features have their own later roadmap; gift-announcement proof is Sandbox-only.",
    entryIds: [
      "hosted-studio-readiness",
      "hosted-private-preview-replay",
      "live-gift-follow-up",
      "live-directory-readiness"
    ]
  },
  {
    id: "app-review",
    tab: "App review",
    title: "Final all-role app review",
    status: "progress",
    scope:
      "One gap-based review across visitors, personal users, sellers, Facility roles and Admin.",
    live: "Finished corrections are grouped in their own milestones. Existing passed tests are reused rather than treating every feature as unfinished again.",
    next: "Finish the genuinely uncovered journeys, responsive and accessibility checks, role boundaries and final owner walkthrough. This is not a claim that the whole app is complete.",
    entryIds: [
      "facility-dashboard-readiness",
      "video-library-readiness",
      "forum-share-readiness",
      "final-web-acceptance"
    ]
  },
  {
    id: "course-gifts",
    tab: "Course gifts",
    title: "Gift a course",
    status: "planned",
    scope: "Buying a course for another person, separate from subscription gifts.",
    live: "Not released. Existing subscription gifting does not provide course gifting.",
    next: "Focused design and implementation follow the current completion work and store-discovery review.",
    entryIds: ["course-gifting"]
  },
  {
    id: "future-lives",
    tab: "Future Lives",
    title: "In-app guests and creator tools",
    status: "planned",
    scope: "Later Live enhancements, after current completion work and course gifting.",
    live: "Not released. Existing hosted Live playback remains a separate completed milestone.",
    next: "Plan guest joining, private backstage preview, host admission and safety, grow showcases and audience tools. Creator tips require provider eligibility and approval before implementation.",
    entryIds: [
      "live-native-backstage",
      "live-host-safety",
      "live-creator-growth",
      "live-creator-tips"
    ]
  }
];

export function updateGroupSections(group: UpdateGroup) {
  return PUBLIC_UPDATE_SECTIONS.map((section) => ({
    ...section,
    entries: section.entries.filter((entry) => group.entryIds.includes(entry.id))
  })).filter((section) => section.entries.length > 0);
}
