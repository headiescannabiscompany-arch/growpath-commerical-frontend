# GrowPathAI pre-polish definition of done

Date: 2026-08-14

Purpose: freeze what must be true before the final route crawl and professional visual
polish begins. This consolidates remaining functional work without replacing the
canonical ledger. Hat work remains next-to-last; App Store and Play Store work remains
last.

## Rules that prevent repeated work

1. A section is complete only when behavior, automated protection, and its required
   live or device evidence pass against recorded frontend/backend SHAs.
2. A completed section reopens only for a reproduced failure, failed regression,
   changed owner requirement, or new authoritative evidence—not because another page
   changed.
3. Empty states do not prove populated workflows. Permissioned, destructive, payment,
   email, location, camera, and notification paths require their named evidence.
4. Tests prove only asserted scope. Deployment, delivery, device behavior, and visual
   usability need separate evidence.
5. The final crawl may fix presentation and connection defects but may not silently
   redefine behavior. A functional gap returns to its owning gate before polish resumes.

## Gate 1 — AI evidence and botanical quality

Complete when:

- Plant ID's governed 320-record catalog is `seed_ready`; every record has reviewed
  morphology, accepted common/scientific identity, supported aliases, life-stage
  scope, lookalikes, confidence behavior, exact rights, attribution, and follow-up
  evidence. The 36 adverse cases use owned or commissioned media.
- Plant ID remains open-world: unlisted plants are not forced into catalog labels;
  family, genus, species, subspecies/variety, hybrid, cultivar, and unresolved results
  are separated according to evidence and current authoritative verification.
- Direct Plant ID accepts photos/video, extracts useful frames, preserves original
  detail, autofills supported fields, works without a Grow or Field Study, and supports
  private device/manual location plus deliberate opt-in Nature publication.
- Nature publication, sensitive-location handling, cannabis/hemp consent, photo pins,
  withdrawal, and map/globe photo display pass one signed-in data-bearing live loop.
- All 252 governed Diagnosis/IPM cases run through the primary path and GPT second
  opinion in authorized staging, compared with the signed catalog.
- Harvest Readiness passes a rights-cleared ordinary-phone corpus with independently
  adjudicated trichome counts and clear/cloudy/amber/glare/warm-light uncertainty. It
  returns a sampled range plus reasons to harvest and wait, and works with or without a
  Grow.
- One Harvest batch write-back, one naturally occurring provider-failure refund, and
  View/Save/Export of exact source-bound AI zoom/crop evidence pass in production.
- Qualified independent review signs off Plant ID, Diagnosis, IPM, and Harvest, or all
  material findings are resolved and re-reviewed.

## Gate 2 — accounts, roles, credits, and administration

Complete when:

- Login, verification, reset, reload, logout, malformed-token recovery, and workspace
  switching pass for Free, Pro, Commercial, Facility Owner, Manager, Staff, Viewer, and
  platform Admin.
- Personal credits remain personal; Facility work consumes the Facility entitlement.
  Commercial and Facility plans do not show a stale 100-token fallback.
- Role permissions pass UI and backend enforcement, including a retained forced 403 and
  audit export for a prohibited Facility mutation.
- `admin@growpathai.com` has platform administration plus intended Commercial tools
  without owning Living Soil Labs or Triple Bag Genetics.
- Reports for every supported content type create an Admin case and deliver an Admin
  email linking to the exact record.

## Gate 3 — Personal, social media, and content loops

Complete when:

- Personal Home, Grows, AI Tools, Forum/Q&A, Discover/Nature, Courses, Videos, Lives,
  and Profile have useful populated landing states and intended navigation.
- Grows preserves logs, photos, tasks, AI results, exports, and a shareable zoomable
  visual timeline for Personal and Commercial users; AI augments the grow workflow.
- Forum discussions, groups, reporting, moderation, videos, and Lives are reachable
  without orphan pages.
- Videos provide Discover search, Following, browsing, comments, upload/remove, course
  attachment/removal, grow interests, storage usage/allotment, and plan-appropriate
  access for Free, Pro, Commercial, and Facility.
- Lives provide upcoming/live/replay lists, scheduling, premieres, viewer volume,
  in-app chat, moderation, share links, and a GrowPath-branded OBS-compatible chat
  overlay/browser source with message-origin badges. GrowPath comments are never
  claimed to enter an outside giveaway picker unless posted through that platform's
  supported API.
- Eligible videos, Lives, journals, AI results, timelines, posts, courses, products,
  and Nature findings support native share/copy link and supported destinations.
- Profile notification preferences work by category; enabled cold-start/background
  notifications open the exact record and disabled categories remain silent.

## Gate 4 — Commercial and Facility workflows

Complete when:

- Living Soil Labs remains the Commercial brand; Triple Bag Genetics remains the
  Facility. Team membership does not merge ownership or data.
- Commercial includes the Personal foundation plus Storefront, products within the
  Storefront hierarchy, courses, campaigns, orders/leads, analytics, product lines,
  batches/lots, trials, inventory, dispensary discovery, and profile controls.
- A populated Living Soil Labs loop passes profile/slug, storefront media/description,
  product, course cover/detail/lessons/edit/publish/archive, campaign, public discovery,
  order/lead, analytics, inventory, and external-only checkout links.
- Dispensaries may publish inventory and be searched by state/distance; GrowPath routes
  to their website or pickup workflow and provides no dispensary checkout.
- Facility provides the Personal/social foundation plus Dashboard, grows, rooms,
  plants, tasks, schedules, journals, inventory, SOPs/runs/compare, compliance, AI
  tools, courses, feed/forum, and profile.
- Facility task creation assigns an eligible team member. Owner, Manager, Staff, and
  Viewer permissions pass every mutation boundary.
- SOP presets, recommendations, uploads, runs, comparisons, actionable completion
  links, schedules, rooms, plants, inventory, compliance, and audit/export pass one
  populated end-to-end Facility workflow.

## Gate 5 — billing, delivery, and data rights

Complete when:

- Paid-course checkout covers success/cancel, webhook enrollment, refund, and dispute.
- Pro and Facility subscriptions cover trial, settlement, repeat protection,
  cancellation, expiry, downgrade, refund, and correct in-app status.
- Commercial Stripe and external-only order/lead/analytics paths pass without inventing
  a GrowPath checkout where none is offered.
- Gifts remain disabled until month/year products, recipient claim across
  signed-out/cross-device flows, cancellation/refund policy, abuse controls, delivery,
  and support ownership are defined and tested.
- Delivered-email evidence exists for reports, purchases, invitations, verification,
  reset, role changes, gifts if enabled, and data-rights workflows.
- A disposable account completes export and deletion/anonymization with redacted
  evidence and correct retention.

## Gate 6 — cleanup and independent acceptance

Complete when:

- The exact 38 approved synthetic accounts are anonymized only after the owner's exact
  confirmation; protected owner, Living Soil Labs, Triple Bag Genetics, and approved
  brand content remain intact.
- Temporary records are deliberately retained/labeled or removed with an audit trail.
- Dead code, unreachable routes, obsolete fixtures, duplicate navigation, and abandoned
  assets are removed only after reference analysis and regression protection.
- An outside-user Personal session and required owner/role sessions are recorded;
  material confusion and dead ends are resolved.
- No P0/P1 functional, data-loss, authorization, payment, privacy, or accessibility
  issue remains open.

## Entry gate for final crawl and professional polish

The final crawl begins only after Gates 1-6 pass or a documented owner-approved
exception names risk, scope, expiry, and release blocker. At entry:

- frontend/backend candidate SHAs are frozen and recorded;
- applicable suites, strict catalogs, security/configuration guards, and deployments
  are green;
- required data-bearing live, email, payment, and device loops are recorded;
- the canonical ledger contains no undefined functional item.

The crawl then inspects every Personal, Commercial, Facility, Admin, and public route in
Day, Night, and Auto at phone and desktop sizes. It verifies headings, Back controls,
loading/empty/error states, navigation, spacing, contrast, touch size, keyboard/focus,
screen-reader labels, media hierarchy, imagery, frequent deep links, and consistent
cards/buttons. Final evidence records URL, role, viewport, timestamp, frontend/backend
SHAs, and deployment.

## Work after crawl/polish

1. Stop before hat execution and wait for the owner. Then complete the exact BLVNK
   specification and the GrowPathAI-only collection, translating owner-selected
   Triple Bag-style directions without using Triple Bag Genetics or third-party marks.
   Obtain owner approval and complete the non-sale website presentation and zero-stock
   purchase-intent trials.
2. Only after that owner-directed GrowPathAI hat work may App Store/Play Store builds,
   protected credentials, metadata, policy
   decisions, physical-device smoke, submission, monitoring, rollback, and go/no-go.
