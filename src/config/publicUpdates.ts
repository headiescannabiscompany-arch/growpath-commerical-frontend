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
    entries: []
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
