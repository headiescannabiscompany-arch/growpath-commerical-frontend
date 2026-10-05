# A04-03 — course resource handoff lifetime

## Reproduced defect and scope

An already-requested protected course document could open after its requesting
detail unmounted: account, token, course and unmount regression cases failed
because `openCourseMedia` opened the URL internally after awaiting access.
This is an automated reproduction, not an observed customer disclosure.

CourseDetailScreen now resolves the authorized resource URL, then checks the
requesting detail's lifetime before opening it. Its existing keyed wrapper
unmounts on account/session/course/workspace/role changes. Late errors are also
discarded. Existing resource/audio buttons, layout, server access checks, raw
URL denial behavior, learner progress, enrollment and payment are unchanged.

## Verification

137 focused + 18 public-marketing tests pass: CourseDetailScreen, uploads-api,
UpdatesPage and public-marketing-export. TypeScript, ESLint, formatting,
contamination/interface guards, diff check and production-format export pass. New cases
cover seven boundary changes, denied document access followed by explicit retry,
and exact saved course/lesson Q&A navigation without learner mutations.

Existing staging Facility Owner course `6aa087edf9e65aac8c36857c` was inspected
read-only. It has no course resources or linked Q&A. Its already accepted text
lesson/progress was not changed or re-completed. This fixture cannot certify
ordinary hosted document delivery or a real linked Forum post.

## Release

Runtime revision `2ac38364ece1877594f78bbf58e325099df64d28`.
Staging `dep-db1okp8u01pc73fe5k7g` LIVE 2026-10-05T11:32:44.951519Z.

On the released staging UI, a tab-only synthetic course response supplied one
fake protected worksheet. Its access GET was held while Back to courses unmounted
the detail, then fulfilled with a harmless synthetic URL. No new tab opened and
the course list remained visible. The first mock attempt intercepted OPTIONS;
after allowing normal preflight the intended GET test passed. This is controlled
browser evidence, not a saved attachment or ordinary-learner delivery claim.
All Fetch patterns were cleared, the real course was reopened successfully with
its original no-resources state, and the Owner was returned to the Facility course
list. No saved course, progress, note, enrollment, publication or account changed.

Production `dep-db1on860tbcc73br7pr0` LIVE 2026-10-05T11:38:07.634362Z.
Canonical https://growpathai.com/courses reload and existing synthetic provider
course `6a60e9d09f3dbb9d83d2c611` detail load pass with no captured browser errors.
No course edit, completion, enrollment, publication or resource opening on
production. https://growpathai.com/updates → Courses → detailed history displays
the revised October 5 course-media note, still within the existing eight-entry
milestone. Proof: workspace outputs/Course_Resource_Handoff_Production_2026-10-05.png.
No backend release, credentials, checkout verification markers or billing changed.

A04-03 is CLOSED / LIVE. Existing course-media public note extended;
no additional milestone/card and no runtime deployment remains pending.

Remaining A04 fixture acceptance is separate: authorized ordinary-learner
document with known bytes and valid linked Forum thread. No all-course closure.
