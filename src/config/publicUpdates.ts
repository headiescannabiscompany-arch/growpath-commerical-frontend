// Curated public release notes only. Never import the private project TODO here.
export const PUBLIC_UPDATES_REVIEWED = "September 15, 2026";

export const PUBLIC_UPDATE_SECTIONS = [
  {
    id: "live",
    title: "Recent updates · Live",
    description: "Available on GrowPathAI now.",
    emptyMessage: "No published releases yet.",
    entries: [
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
      }
    ]
  },
  {
    id: "testing",
    title: "Pending updates · In testing",
    description: "Not yet released. Items appear here when testing is underway.",
    emptyMessage: "No additional updates are currently listed as in testing.",
    entries: [
      {
        id: "timeline-photo-editing",
        title: "Add photos to older journal entries",
        date: "September 15, 2026",
        dateLabel: "Testing started",
        summary:
          "Photo attachments in the existing entry editor are being tested. This change is not live yet; saved photos and entry dates must remain intact."
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
        title: "Grow timeline improvements",
        date: "September 15, 2026",
        dateLabel: "Plan reviewed",
        summary:
          "Add photos to existing entries, improve calendar-date accuracy, and make shared visual timelines show multiple milestones and photos."
      },
      {
        id: "account-admin-controls",
        title: "Account and Admin controls",
        date: "September 15, 2026",
        dateLabel: "Plan reviewed",
        summary:
          "Finish verification of account-management and removal controls, with safeguards for protected accounts and existing user content."
      },
      {
        id: "complimentary-access-live-gifts",
        title: "Complimentary access and gifts during Lives",
        date: "September 15, 2026",
        dateLabel: "Plan reviewed",
        summary:
          "Complete remaining release checks for Admin-issued complimentary access and the connection between Live chat and subscription gifting."
      },
      {
        id: "admin-safety-review",
        title: "Private Admin evidence and reporting tools",
        date: "September 15, 2026",
        dateLabel: "Plan reviewed",
        summary:
          "Complete privacy, access-control, retention, and reporting review before wider availability of sensitive Admin tools."
      },
      {
        id: "course-gifting",
        title: "Gift a course",
        date: "September 15, 2026",
        dateLabel: "Plan reviewed",
        summary:
          "Purchase a course for someone else. This is planned after the current account-management and timeline work."
      }
    ]
  }
] as const;
