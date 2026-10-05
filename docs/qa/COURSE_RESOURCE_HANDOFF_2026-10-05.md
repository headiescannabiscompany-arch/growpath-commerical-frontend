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

137 focused tests pass: CourseDetailScreen, uploads-api, UpdatesPage. New cases
cover seven boundary changes, denied document access followed by explicit retry,
and exact saved course/lesson Q&A navigation without learner mutations.

Existing staging Facility Owner course `6aa087edf9e65aac8c36857c` was inspected
read-only. It has no course resources or linked Q&A. Its already accepted text
lesson/progress was not changed or re-completed. This fixture cannot certify
ordinary hosted document delivery or a real linked Forum post.

## Release

Pending exact-revision gates, staging deployment/check and production deployment.
Update the existing course-media public note, not another milestone/card.

Remaining A04 fixture acceptance is separate: authorized ordinary-learner
document with known bytes and valid linked Forum thread. No all-course closure.
