// Curated public release notes only. Never import the private project TODO here.
export const PUBLIC_UPDATES_REVIEWED = "September 22, 2026";

export const PUBLIC_UPDATE_SECTIONS = [
  {
    id: "live",
    title: "Recent updates · Live",
    description: "Available on GrowPathAI now.",
    emptyMessage: "No published releases yet.",
    entries: [
      {
        id: "account-admin-controls",
        title: "Account management and complimentary access",
        date: "September 22, 2026",
        dateLabel: "Status confirmed",
        summary:
          "Admin account quarantine and restoration checks are complete using synthetic accounts. Complimentary invitation resend, claim, and revoke checks are complete, and the invitation correction is live. These controls do not automatically remove accounts or cancel paid subscriptions."
      },
      {
        id: "admin-case-management",
        title: "Private Admin case-management tools",
        date: "September 22, 2026",
        dateLabel: "Status confirmed",
        summary:
          "The existing private Admin interface includes case notes, restricted reporting, and reviewed evidence controls. Synthetic reporting and notification checks are complete. Remaining recovery and independent-access acceptance are listed below; this does not announce public evidence access or automatic reporting."
      },
      {
        id: "timeline-mobile-heading",
        title: "Timeline headings that fit on phones",
        date: "September 21, 2026",
        dateLabel: "Released",
        summary:
          "Grow titles and milestone counts remain visible on narrow screens. The phone-width fix was verified in production without changing timeline photos, dates, or sharing destinations."
      },
      {
        id: "grow-journal-completion",
        title: "Cleaner grow and journal creation",
        date: "September 20, 2026",
        dateLabel: "Released",
        summary:
          "The new-grow success popup closes when you choose your next step. After a journal entry saves successfully, its completed draft and photo selections clear so they are not reused in the next entry. Failed saves keep the draft available to retry."
      },
      {
        id: "timeline-photos-sharing",
        title: "Visual grow stories and journal photos",
        date: "September 19, 2026",
        dateLabel: "Released",
        summary:
          "Add photos to older journal entries and share a reviewed horizontal grow story with clickable milestones and photos. Share Timeline opens the existing sharing review. Visual Flow and Detailed List keep each journal entry with its photos instead of repeating separate photo-added rows. The Facebook preview was verified live with multiple dated points and selected photos. Sharing uses your published snapshot; later private edits need a new reviewed publication."
      },
      {
        id: "profile-age-confirmation",
        title: "Complete missing age information in Profile",
        date: "September 19, 2026",
        dateLabel: "Released",
        summary:
          "Older accounts missing age information can now complete the age-confirmation step in Profile. Content visibility remains a separate choice; this does not change existing age records or publish anything."
      },
      {
        id: "subscription-checkout",
        title: "Subscription checkout and recovery",
        date: "September 15, 2026",
        dateLabel: "Released",
        summary:
          "Monthly and yearly checkout for Pro, Commercial, and Facility plans has been updated, including recovery of an interrupted checkout."
      },
      {
        id: "facility-billing",
        title: "Billing for your facility workspace",
        date: "September 15, 2026",
        dateLabel: "Released",
        summary:
          "Facility checkout is tied to the selected workspace, with its owner, staff, and viewers covered by that workspace subscription."
      },
      {
        id: "commerce-checkout",
        title: "Course, storefront, and marketplace checkout",
        date: "September 15, 2026",
        dateLabel: "Released",
        summary:
          "Purchase checkout includes interrupted-checkout recovery and duplicate-payment protection. Digital purchases use verified access and download delivery."
      },
      {
        id: "commerce-refunds-sellers",
        title: "Purchase refunds and seller payments",
        date: "September 15, 2026",
        dateLabel: "Released",
        summary:
          "Refund handling and Stripe seller allocation have been updated. Purchase, partial/full refund, and seller-allocation flows passed Sandbox checks; those checks did not move real money or verify a bank payout."
      }
    ]
  },
  {
    id: "testing",
    title: "Updates in progress · Development and testing",
    description:
      "Work already underway. Existing features may be live; the improvements and checks below are not yet complete.",
    emptyMessage: "No additional updates are currently listed as in testing.",
    entries: [
      {
        id: "recovery-release",
        title: "Recovery improvements: tested, not yet released",
        date: "September 22, 2026",
        dateLabel: "Progress reviewed",
        summary:
          "The recovery improvements have passed automated checks and staging verification. Production integration, a fresh backup and isolated restore check, and release verification remain unfinished. Staging success is not a live release; completed tests are not being listed as unfinished features."
      },
      {
        id: "live-gift-follow-up",
        title: "Live gift follow-up",
        date: "September 22, 2026",
        dateLabel: "Progress reviewed",
        summary:
          "Subscription gifting and its payment checks are already implemented. Remaining work reconciles the Live/chat fulfillment checks with those completed payment results. Course gifting is separate planned work, not part of this release."
      },
      {
        id: "admin-passkey-protection",
        title: "Passkeys for sensitive Admin actions",
        date: "September 22, 2026",
        dateLabel: "Progress reviewed",
        summary:
          "Admin passkey setup and clearer security fields are available, and automated checks are complete. Remaining independent administrator setup and two-person access acceptance are not yet complete. Ordinary sign-in and the existing page layout stay the same."
      },
      {
        id: "final-web-acceptance",
        title: "Final web and operational checks",
        date: "September 22, 2026",
        dateLabel: "Progress reviewed",
        summary:
          "Saved-video automated regression checks are complete. Remaining work covers targeted mobile layouts, accessibility, permissions, and additional sharing and export checks, plus final contact and operational review. This is follow-up verification of existing features, not a redesign or a claim of completed legal review."
      }
    ]
  },
  {
    id: "planned",
    title: "Future updates · Planned",
    description: "Planned work, not a promise of a release date. Priorities may change.",
    emptyMessage: "No planned updates are currently listed.",
    entries: [
      {
        id: "timeline-improvements",
        title: "Timeline and journal follow-up checks",
        date: "September 22, 2026",
        dateLabel: "Plan reviewed",
        summary:
          "Investigate reported calendar-date mismatches and finish checks for longer timelines and additional sharing destinations. These follow-up checks are separate from the released visual-story, photo, and creation-screen updates."
      },
      {
        id: "store-discovery-review",
        title: "Easier store and product discovery",
        date: "September 22, 2026",
        dateLabel: "Plan reviewed",
        summary:
          "Review Discover scrolling, paths to full product catalogs, and commercial storefront navigation on desktop and phones. Investigate reported browsing friction before proposing focused fixes. The review is planned before course gifting; larger layout changes require separate approval."
      },
      {
        id: "course-gifting",
        title: "Gift a course",
        date: "September 15, 2026",
        dateLabel: "Plan reviewed",
        summary:
          "Purchase a course for someone else. This remains planned after current completion work and the store-discovery review. Larger storefront changes may follow it if their estimated work is longer. Course gifting is not available as part of the completed subscription-gifting work."
      }
    ]
  }
];
