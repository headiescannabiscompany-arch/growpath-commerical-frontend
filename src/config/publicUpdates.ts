// Curated public release notes only. Never import the private project TODO here.
export const PUBLIC_UPDATES_REVIEWED = "September 27, 2026";

export const PUBLIC_UPDATE_SECTIONS = [
  {
    id: "live",
    title: "Recent updates · Live",
    description: "Available on GrowPathAI now.",
    emptyMessage: "No published releases yet.",
    entries: [
      {
        id: "product-buy-signin-return",
        title: "Safer sign-in from product purchases",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "Signed-out shoppers choosing Buy on storefront cards or ordinary product details now go to sign in and return to the same product when its saved identity is verified. Signing in does not place an order or open checkout automatically. Existing purchase-interest, eligibility and payment rules stay unchanged. New-account verification and course purchase returns remain separate follow-ups."
      },
      {
        id: "product-line-safety",
        title: "Reliable product collections and safer editing",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "Public store collections now consistently include products assigned to the selected collection. Seller editing waits for the correct saved product line, with clear recovery when a record is unavailable. Existing storefront design, publication permissions and checkout rules stay unchanged."
      },
      {
        id: "store-directory-recovery",
        title: "Store discovery and safer seller setup",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "The store directory now shows public stores without requiring a search first, remembers your search when you return, and offers clear and retry controls. Seller setup prevents saving after a failed load, and public previews use the saved store address. Existing page layout, permissions, location choices and checkout rules are unchanged."
      },
      {
        id: "shopping-browse-paths",
        title: "Clearer product browsing and store links",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "Discover rows now have visible previous/next controls. View all Products, Offers & Trials opens a searchable catalog, and product details link directly to the full owning store. Existing customers signing in to record product interest return to that product. Interest-only items remain separate from purchases; checkout and privacy rules are unchanged."
      },
      {
        id: "journal-large-photo-upload",
        title: "Larger journal photos and safer retries",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "Journal uploads now prepare oversized supported images to fit the upload limit without changing the original file on your device. Add photos to new or existing entries, and retry a failed save without uploading completed photos again. Grow-list connection errors now show a retry option instead of an incorrect limit-reached message. A 14 MB JPEG passed staging save, append, and recovery checks; format support still depends on your browser or device."
      },
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
          "Saved-video automated regression checks are complete. The full-app journey review covers visitors, personal customers, sellers, facility roles, and administrators: discovery, actions, return paths, mobile layouts, accessibility, permissions, sharing and exports. Focused shopping navigation fixes are listed as released separately; this broader review and final operational checks remain in progress."
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
        title: "Further storefront experience improvements",
        date: "September 22, 2026",
        dateLabel: "Plan reviewed",
        summary:
          "After the focused browsing and catalog fixes, review the broader shopping and seller journeys, collection organization, and campaign clarity. Any larger layout changes require separate approval and will be ordered against course gifting by estimated effort."
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
