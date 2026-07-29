# Content-report production evidence — 2026-07-27

## Scope

Production URL: https://growpathai.com

This record covers the first genuine production report email observed after the report-to-moderation implementation. It distinguishes delivered-mail evidence from role-gated page access; it does not claim that an admin action was completed.

## Delivered report email

Connected mailbox: headiescannabiscompany@gmail.com (owner mailbox)

Browser evidence captured July 27, 2026 from Gmail:

- Subject: [GrowPathAI report] course: QA ONLY — $1 Paid Course Lifecycle — 2026-07-26
- Sender: GrowPathAI <noreply@growpathai.com>
- Reported content: QA ONLY — $1 Paid Course Lifecycle — 2026-07-26
- Content type: course
- Content ID: 6a663d0508a5c374af9abf28
- Report ID: 6a66da9ea79aafa8dc0cfca3
- Moderation case: 6a66da9ea79aafa8dc0cfca5
- Reported by: jcindc2003@yahoo.com
- Submitted: 2026-07-27T04:12:14.380Z (July 27, 2026, 12:12 AM EDT)
- Reason: Production QA report-path verification after backend 52cd1f7 deployment.
- The message contains both Open moderation review and Open reported content links.

This confirms a real provider-delivered admin notification with the exact content identifiers and timestamp. No credentials, tokens, or provider secrets are retained here.

## Deep-link retest

The exact links from the delivered message were opened in the authenticated in-app Browser:

- Admin review: https://growpathai.com/admin?moderationCaseId=6a66da9ea79aafa8dc0cfca5&targetType=course&targetId=6a663d0508a5c374af9abf28
  - The route loaded the production app and truthfully returned Platform owner access required for the current signed-in role.
- Reported content: https://growpathai.com/courses?courseId=6a663d0508a5c374af9abf28
  - The route loaded the production Courses surface, which truthfully returned Courses unavailable / missing COURSES_VIEW for the current signed-in role.

These are valid role-gated route results, not evidence that the moderation review action itself was completed. A platform-owner session and a content-authorized session are still required to verify the rendered case and exact course page end to end.

## Implementation references

- Frontend report flow merge: ade1c3644339f833a363a4e0ba6224a1cfb9ff7b
- Backend report flow merge: d79118beaf6dff23561dade9dd8be81f000f72e1
- Frontend and backend implementation/tests cover Forum posts, Feed campaigns, storefront products, courses, videos, and live sessions; the backend persists the moderation case before notification and records provider failure without erasing the report.

## Remaining acceptance

- Reopen the moderation case in a platform-owner session.
- Reopen the reported content in a role with the required content permission.
- Record the final live deployment SHA and timestamp for that retest.
