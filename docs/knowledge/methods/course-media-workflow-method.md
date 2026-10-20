# Course Media Workflow

## Private course gift support reference connection

The private web support panel obtains a server-issued reference before course-gift
checkout evidence review or read-only delivery assessment. Its separate request ID
is generated only by an explicit new-review action, or re-entered from the original
request for recovery. Once attempted, freeze the exact gift, purchaser, checkout
attempt, action and request ID through uncertainty. The same request recovers the
same reference; neither reload nor missing evidence authorizes a replacement.
No private form, token or request/reference is persisted in browser storage.

The two fixed private POSTs reuse canonical JSON, origin/bearer quotas, no-store,
diagnostic suppression and the existing Platform Owner/fresh-passkey controls.
Checkout and delivery consumers verify the issued reference and its atomic audit
against the original operator, intended action and exact current source inside
their existing transaction. A bare UUID, current plan or generic Admin role is not
authority. The ordinary Commercial recovery path and read-only historical lookup
remain separate; old recovery history is not a newly issued reference.

Issuance never submits a recovery. Checkout evidence still needs the original
Session, exact reason, typed confirmation and separate unchecked acknowledgment.
Delivery assessment uses the exact original state version and generation, returns
only a technical snapshot and clears displayed results after edits. It cannot
restore scheduling, send mail, refund, grant access or verify original evidence.
Proof loss hides private state; renewal never replays. Identity change/unmount
discards state and late replies. All new paths share the existing bounded quiet
transport, with no balance notification, sign-out, automatic retry or redirect.

The public/default/native panel and live gifting remain closed. The staging-only
Admin outlet described below is a separate explicit-open source connection, not
hosted acceptance or payment activation. Missing original evidence/request correlation,
retention/disposition, private browser/real-authenticator, hosted/provider and
release/activation gates remain separate. Ordinary support email/Admin notes are
intake only, not a private evidence channel. Plans and credits stay unchanged.

## Dormant paid-invitation scheduling and lifecycle (October 19, 2026)

Local implementation adds private `deliveryQueue` metadata to the existing
CourseGift outbox, not a new payment or mail ledger. Existing payment, delivery,
renewal, claim and refund/dispute transaction writers update the projection with
their saves. Reads/validation do not populate it. Unpaid checkout fingerprint and
withdrawal writes remain separate and cannot enqueue paid delivery.

Due selection requires the exact declared non-TTL index on queue version, state,
due time and gift ID, verified on every read. Only bounded, allowlisted metadata
is read; oldest-due/ObjectId seek pagination progresses past review tickets.
Selection is not permission to send: existing payment/account/course fences,
delivery leases, generation and same-send idempotency remain authoritative.
In-flight final attempts retain their existing lease. Accepted/claimed gifts stop
scheduling; held, permanently failed or exhausted sends require review. Security
link expiry parks sending without expiring the paid gift or issuing a refund.
Only the accepted explicit renewal operation may rotate an invitation.

The dormant dispatcher now connects this selector to the existing delivery attempt.
Before sending, majority-acknowledged compare-and-swap reserves the exact state
version, queue generation and due time for two minutes. Review, settled and deferred
tickets persist under the same fence. A failed/uncertain write never authorizes a
send. The engine's newer state wins; a later dispatcher reuses its existing token,
lease and idempotency key. Configuration/authority failures park only when the exact
reservation still owns the version. Unknown failures retain durable recovery state.
No automatic restoration, fresh payment, token generation or refund is introduced.

Each explicit cycle selects at most five records and yields between operations after
20 seconds; this is not a hard deadline on the existing in-flight delivery operation.
Instances are single-flight and competing instances use the database fence. Results
contain aggregate counts only. Construction pins the database binding, and public
dispatch remains hard-disabled. R09-06AF adds a literal-disabled server registration
using the existing recovery worker's extracted single-flight polling/drain controls.
There is no environment or request activation switch. Disabled startup resolves no
delivery secret, database model, dispatcher or transport. Internal composition pins
the database/model, environment, validated key/origin and actual transport identity;
changes close admission and cannot establish a fresh heartbeat.

Completion-based polling waits60seconds; success heartbeat freshness is180seconds.
Shutdown closes admission before HTTP closure and waits at most7500ms for the active
cycle before database closure. An unresolved drain remains visible and produces a
nonzero shutdown result; it never erases a durable reservation or asserts cancellation
of an uncertain send. The dispatcher stops between records and after reservation,
before a new send. Late completion cannot restore readiness or overlap a restart.
The private status projection contains fixed codes/booleans, never recipients,
tokens, secrets or raw provider errors. Delivery health remains separate from API
readiness so signed payment reconciliation is not taken offline by delivery trouble.

R09-06AE adds 29 passing new local real-database checks, including actual non-TTL
index/IXSCAN evidence, projection rollback, competing dispatchers, claim/refund races,
reconnect and uncertain-send recovery. The 71+3 earlier synthetic checks were not
rerun. Only an owned temporary loopback database and simulated sender were used;
no hosted index or account changed. Missing legacy projections still require a
reviewed coverage/migration plan; an empty queue does not prove coverage.
R09-06AF adds49 new mocked lifecycle/server/drain checks and37 directly affected
recovery-control regressions (32 extracted polling cases and five shutdown-result
cases). The29 database checks and all closed browser/renewal journeys were not rerun.
R09-06AG separately passes one joined local worker/dispatcher/existing-engine
journey with an owned loopback MongoDB and two sequential Node processes. Drain
during a simulated send stops admission of the second gift and preserves the
uncertain first invitation. A fresh process recovers the same token, generation,
idempotency key and payload, then an explicit restart finds no accepted gifts to
send again. Both processes disconnect with no worker timers; synthetic account
plan/credit snapshots are unchanged. No application engine code changed, and no
closed49/37/29/71+3 suite was rerun.
The child fixture substitutes only synthetic delivery context and transport through
the existing guarded local adapter. This is worker-process evidence, not a full
server.js boot, actual OS signal, hosted-context resolution, provider/inbox, volume,
native or release acceptance. Legacy coverage/migration/restoration and launch gates
remain. Live gifting, plans and credits stay unchanged.

## Course-gift no-expiry policy (owner decision October 19, 2026)

For newly approved course-gift terms, the owner chose no automatic claim expiry and
no inactivity fees; unusable gifts receive manual refund review, not automatic
refunds. The local policy extension binds explicit `claimExpiryMode: none` and
`inactivityFeeCents: 0` to saved policy/consent/intent fingerprints. No approved row
is seeded. Preserve older saved terms and payload hashes; never relabel a receipt.

Under this explicit extension only, the existing finite `claimWindowMs` and
`claimExpiresAt` are the invitation-security window, not forfeiture of the paid
gift. The email and recipient view distinguish that deadline. Expired links remain
unusable and never create a replacement payment, refund or account change. A secure
same-gift link-reissue/manual-review workflow remains required before launch. The
internal engine and dormant recipient wiring below do not promise uninterrupted
or lifetime course availability.
The policy review's own expiresAt and the claimed-response replay timeout remain
separate security/freshness controls. Existing legacy policy behavior is unchanged.
Live/public/native gifting stays closed; provider eligibility, approved full wording,
retention/disposition and hosted acceptance are not supplied by this owner decision.

## Dormant recipient replacement invitation

An expired original invitation may be reviewed only through the authenticated
private recipient path. A trusted server resolver supplies the existing delivery
key, origin and transport revision; there is no client-supplied key or environment
fallback. The review shares renewal's current recipient, account, payment, course,
policy and accepted-delivery checks, without write fences, token rotation or mail.
Only a matching verified recipient receives the masked renewal preview. Ordinary
claim still rejects expired tokens. Missing links, uncertain delivery or unavailable
keys remain manual review.

An explicit replacement request uses a strict private POST with only gift ID,
original token and one opaque operation ID. Bearer identity supplies the actor;
origin, quotas, canonical bounded JSON and generic errors remain mandatory. The
existing transaction engine rotates only the same gift's invitation and retains
the prior delivery receipt. No payment, claim, plan or credit is created or changed.
The local-only composition may inject the resolver, but default/public/native
paths remain closed and no sender is invoked by this request.

The recipient screen uses the existing continuation and quiet 20-second client.
It generates an operation only on an explicit click and retains it in instance
memory through an uncertain reply for deliberate same-request retry. It never
stores a token or renewal operation in browser storage. Session/account changes,
leaving or reload discard the continuation; a lost recovery requires the new
invitation or manual support review, not an invented resend. A recorded replacement
does not prove inbox delivery or course access; the new invitation still requires
an explicit authorized claim. Public UI remains unavailable.

R09-06AB locally accepts 12 new mocked-access checks, 13 private HTTP checks with
mocked services and 13 mocked UI/client/session checks, plus five directly affected
engine regressions after extracting shared read-only eligibility. These are not a
joined HTTP/database journey, actual-browser/inbox proof, production key resolution
or release acceptance. No old transaction, consent or payment phase was restarted.

## Local course-page gift entry composition

Shared course details and the Commercial author page contain inert gift outlets.
Only an explicit test-mode, loopback web root composes the existing sale host and
recipient continuation; the shipped root remains disabled. The outlet requires a
matching saved/requested course identity, settled verified account and Personal or
Commercial scope. Facility-attributed courses remain excluded. Shared native owners
can review existing consent even on drafts; Commercial owners use the author page,
not its learner preview. Buyers need a published paid course; server review remains
the authority for price, consent, eligibility and payment readiness.

Opening is deliberate and sends no request. Reuse the existing account/course hint's
original attempt or creator request before generating an opaque ID on a fresh click;
never generate on mount/reload, overwrite corrupt storage or imply missing history
means no payment. Existing expired-hint/status-only recovery rules remain. No new
storage format, private payload persistence, cross-device or operator transfer.
Account/token/workspace/role/verification/course changes discard the private form;
diagnostic suppression is held before its children mount on a generic course URL.
This is not analytics consent or third-party capture certification. Normal course
purchase, enrollment, authoring and public/native gifting defaults stay unchanged.
Local tests are distinct from browser, provider, hosted and release acceptance.

## Dormant read-only recovery history

The private support boundary admits two exact history POSTs alongside its existing
recovery actions. History carries only original gift/course, buyer, checkout-attempt
and support-operation references, never a Session, reason, proof in a URL or search
filter. Reuse canonical bounded JSON, reviewed origin, bearer, quota, no-store and
diagnostic protections. The existing trusted reader rechecks the original operator's
current Owner/passkey authority; generic Admin audit is not an alternative reader.

Return only unknown, request_recorded or binding_recorded and the mandatory
historical-only/original-evidence-required flags. Reject expanded or misleading
responses. A recorded request does not establish a binding; missing/unavailable
history does not establish no action or no payment. Historical binding is not
current payment, refund, access, payout or support resolution.

The internal web panel offers a separate explicit history read using the four
original references. It needs neither the lost Session nor reason and cannot
restore either. Reads serialize with recovery, clear acknowledgment, never submit
or authorize retry, and leave an attempted recovery's frozen input intact. Edited
references clear prior results. Proof loss hides history, renewal never replays,
and identity change/unmount discards results and late replies. Use the existing
bounded quiet client and private diagnostic scope; no browser storage or transfer.

This is dormant local HTTP/mock-client/panel evidence, not actual database snapshot,
authenticator, browser/privacy-provider, candidate provenance or hosted acceptance.
Public/native entries remain closed with no live route/menu mount. Full lost-form
and cross-device restoration, policy/retention and provider readiness remain gates.

## Private checkout support panel and staging entry

The internal web panel reuses the accepted exact-candidate controller and existing
Admin passkey UI in verification-only mode. Default public/native entries remain
closed; production remains unmounted. Verification does not enroll/remove a key
or submit a support action. Existing default passkey management stays unchanged.
Explicit original gift/ordinary Commercial evidence, exact typed confirmation and
a separate unchecked review acknowledgment precede submission. Editing unattempted
input invalidates review; attempted inputs and operation/reason remain frozen.
Unknown, denied and disabled replies retain the same request, not a new charge.

Expired/cleared proof hides private fields and clears acknowledgment; same-account
renewal never replays. Account changes clear the form and ignore late replies;
unmount disposes the controller. Reload starts blank, not a recovered operation.
No local/session storage, contact-message inference or automatic candidate lookup.
Success means evidence linked for review only, not payment, refund, access, payout
or resolved support. Unusable gifts retain the owner's manual-refund-review policy.

Before private children mount, hold an in-memory diagnostic suppression scope in
the existing logger/monitoring filters, including generic Admin URLs. Release it
idempotently on unmount; overlapping panels retain protection. It stores no private
payload or consent state. Fixed private errors and autofill opt-out apply. This is
not analytics consent, third-party session-replay certification or actual browser
privacy acceptance. Local mocked panel tests do not prove real passkey/device,
candidate provenance, lost-storage/cross-device, provider or hosted readiness.

The staging candidate's existing Admin page exposes a closed-by-default support
entry only under the prepared exact-staging transport, web platform and settled,
verified Admin session. Workspace mode does not grant or remove Platform Owner
support authority. Opening is deliberate; merely displaying Admin must not request
support records, issue references, run a passkey ceremony or submit recovery.
The server's configured Owner, fresh passkey and original-evidence requirements
remain authoritative; a generic Admin role is only client display eligibility.

Close, account/token/identity change, lost readiness or changed transport removes
the private child and its in-memory form. Reopening requires another deliberate
click. Same-account proof renewal/expiry does not replace that child: its existing
controls hide private values, retain the exact operation where required and never
resubmit automatically. Do not put bearer tokens in React keys, URLs or storage.
The new route connection passed nine focused local cases and a four-root typecheck.
Six cases passed initially; three test-renderer fixture failures were repaired
without application changes, and only those three reran. The offline staging
export also compiled the new outlet and preserved private gift shells. These are
local source/artifact results, not real Owner/passkey, browser or hosted evidence.
Carry the accepted controller/panel and customer-journey checks forward.

## Private checkout support client

The internal course-checkout support controller reuses existing memory-only Admin
passkey proof and the two exact support POST contracts. The staging-only Admin
entry reuses it without changing the engine; production/public/native entry stays
closed. Construction and preparation make no
request; explicit confirmation and fresh proof precede a bounded, single-flight POST.
Use quiet transport without automatic retries, sign-out, balance events or redirects.
Current server Platform Owner, proof and exact-evidence checks remain authoritative.

After any attempted request, freeze the original candidate, operation and exact reason
in page memory. Only deliberate same-request retry is allowed, including after same-
account passkey renewal. A timeout, denial or missing reply does not establish that
nothing happened. Identity changes/disposal clear the candidate and discard late
responses. No storage, diagnostics, public URL or support-message handoff may retain
the private candidate/proof/reason. Reload loses this continuation; authoritative
candidate sourcing and lost-storage/cross-device recovery remain separate work.

Accept only an exact matched bound_for_review reply. It is not payment completion,
refund, paid access, seller settlement or support-ticket resolution. The compact
panel above has separate local acceptance; actual authenticator/browser and hosted
acceptance remain separate gates.
This source connection does not enable payments, alter policy, change account
plans/credits or modify the existing authentication/recovery engines.

## Course gift router handoff

The dormant gift host must tolerate Expo rendering a destination before browser
history commits it. Preserve a deliberate exact login handoff until its login
route has actually been observed; an intervening render of the claim page must not
clear it. Keep existing session-change, exit, TTL and explicit-request guards.
Use committed router state rather than a lagging browser URL for journey ownership
and exit cancellation. After capture, scrub the claim fragment/query from both browser
history and Expo route params so router serialization cannot restore it. Wait for
navigator readiness and use the installed router's empty-fragment representation.
The closed public screen must also scrub new private URL input on same-page changes
without mounting a journey or sending a request. This is not permission
to persist an invitation, broaden login destinations, grant access or enable gifting.
R09-04D reproduced these integration defects and verified the targeted repair in
a local browser with installed ExpoRouter, synthetic auth and read-only transport.
Initial capture/login return, replacement/malformed links, auth/exit stale replies,
closed entry and compiled diagnostic filtering are evidenced. No real login,
full app root, SDK telemetry, provider, hosted or native release is inferred.

## Course gift UI typing boundary

R09-04C's browser check reproduced missing web checked state on the dormant
creator and buyer confirmation controls. Preserve native accessibility state
and expose explicit aria-checked (and the creator control's disabled state) on
web. Both confirmations still start unchecked and require a deliberate click;
this accessibility repair does not grant consent or activate live gifting.

R09-03H corrects the existing claim guard's control-flow typing and documents
PrimaryButton with React Native props. Preserve the non-null approved review
snapshot before the asynchronous claim and all busy/disabled accessibility state.
The guard still throws on the same invalid conditions; button runtime is unchanged.
No cast, removed guard or hidden busy state is a substitute for correct typing.

Scoped TypeScript 5.9.3 inspection clears the four recorded diagnostics and one
identical WebScreen occurrence: zero diagnostics across 24 named source/test files
and five other in-program button consumers. This is local static evidence, not
whole-project or browser acceptance. No runtime suite repeated. Earlier four-error
notes below are superseded by H. The later 04A/04B HTTP/database and bounded 04C
browser receipts supply separate local evidence; actual app auth/router, HTTPS/
proxy and compiled monitoring are not certified by the synthetic browser fixture.
NEXT is the active queue's first CURRENT, not earlier historical pointers here.
Live/public/native gifting OFF; plans/credits unchanged.

## Course gift retention and account removal

R09-03G extends the existing removal barrier to independent creator consent,
buyer-review receipts and policy-reviewer records. A missing gift cannot erase
their provenance. Revoked/superseded consent and terminal payment state do not
authorize deletion. Only identifiers are read by the guard; failed/unavailable
reads return an unverified blocker without private payloads. Invited email alone
is not ownership and must not block an unclaimed recipient's account removal.

New buyer receipts privately and immutably bind the original server-confirmed
creator. Same-attempt reservation and reviewed checkout require that identity;
ordinary receipt serialization remains version-only. Do not infer the creator
from today's course owner or silently retrofit a receipt. Missing/invalid legacy
creator provenance conservatively blocks removal pending explicit migration review.
Existing course withdrawal/ownership checks also protect standalone consent/receipts.
Admin quarantine rechecks inside its existing transaction after the User lifecycle
claim and before content withdrawal; a retention failure rolls back that claim.

Creator withdrawal stays an explicit existing operation and retains the receipt.
Do not add automatic consent restoration, refunds, TTL/purge or financial erasure.
No generic account-archive duration applies to these stores by implication. An
approved duration/disposition/redaction/export/hold/archive policy and separately
reviewed legacy migration/index verification are activation gates. A conservative
blocker is not complete retention-policy or account-deletion acceptance.

37 distinct new local cases accepted across 34 initial passes, one corrected
immutable-update assertion passing alone, and two added positive checkout/quarantine
controls. Synthetic loopback DB and mocked provider only, cleanup complete; no
hosted/browser/full-removal/Facility-transfer acceptance. Live/public/native gifting
OFF and plans/credits unchanged. H closes the inherited UI diagnostics above;
NEXT is scoped actual HTTP+DB/browser integration; other recorded gates remain separate.

## Commercial authored-content agreement

R09-05A extracts the existing authored-content projection into one shared mapper,
still used by the existing transactional writer. An internal comparison applies the
current Course schema's casts/defaults, checks exact source/mirror identity and
ownership, and compares the complete authored fields supported by that projection:
course presentation, ordered lesson identities/text/media, documents, live-session
details and linked records. Missing lesson reads, duplicate/invalid lesson identities
and schema failures are unverified, not assumed empty. Keep returned errors generic.

Return only a private immutable versioned fingerprint. Learner discussion/progress,
counts, ratings, revenue, timestamps, internal versions and checkout leases are not
authored content and must not change this fingerprint. The comparison neither repairs
records nor verifies external media availability, rights, publication, price, seller
readiness or consent. Arbitrary unmapped source metadata is outside its contract.
Equal content in two current reads is not a historical content archive or an atomic
read/write guarantee; the fingerprint must not be exposed as learner content.

All 24 new pure/mock cases and three directly affected existing projection checks
pass first run (27/27, 1.08s; four unrelated legacy cases excluded). Inputs are
unchanged; no database/server/network calls are allowed. The mapper extraction keeps
the writer's existing seller gate, lifecycle and learner-history separation. This is
local evidence only. R09-05B now connects it to dormant Commercial gift review,
reservation and creation; its separate targeted acceptance is recorded in the active
queue/finite receipt. R09-05C adds ordinary checkout below; claims and learner readers
remain outside this content check. Provider/browser/hosted/native acceptance and release remain
separate. Live gifting stays OFF and plans/credits stay unchanged.

R09-05B uses one complete authored-field selection for the initial reviewer and both
transactional consumers. Read only the mapper's source inputs privately, including
fallback fields; never return lesson bodies, media URLs or arbitrary payload metadata.
Bind the versioned content digest inside the existing review fingerprint. The public
quote and immutable receipt schema stay unchanged. A changed source/mirror or matching
joint edit requires new review; the source/Course transaction fences remain in place.
An older Commercial receipt remains readable but must not be backfilled or authorize
new creation without its original content binding. Native fingerprints are unchanged.
Do not apply this acquisition check to already-paid reconciliation, refunds or learner
grants. It is not a historical archive, remote media check or cancellation of an issued
provider session. All 29 new cases plus two directly affected reader checks pass
first run (31/31, 48.781s); 22 unrelated cases excluded. Synthetic loopback MongoDB
and mocked payments only; account/I/O guards pass and owned cleanup leaves no mongod.
No receipt/test repair or repeated 05A checks. This is not hosted/provider acceptance.

## Ordinary Commercial course checkout authority

R09-04Z adds a read-only sale-source prerequisite to ordinary paid-course checkout,
separate from dormant gifting. Capture the exact source/mirror identity and owner,
published public/unlisted visibility and matching safe positive amount before seller
preflight. Re-read both afterward and reject changed sale facts before entering the
existing reservation/provider engine. Reuse the Commercial projection's source price,
publication and visibility mappers, including supported legacy-dollar amounts.
At 04Z, read only sale fields with a five-second database execution limit; failures return
generic 409/503 responses, never source lessons or database diagnostics. The private
in-request snapshot is not persisted buyer consent or a lesson-content revision.

All 28 newly approved mock/handler checks pass first run (2.965s). They cover source
withdrawal, price/owner/visibility changes across preflight, exact identity, inactive
mirrors, safe failure, selected readers and focused native/Facility handoff. Synthetic
account and I/O guards pass. Authentication/readiness middleware is checked structurally,
not through a real HTTP session. No database/server/provider/email or completed-case
rerun. This is local uncommitted evidence, not hosted or real-payment acceptance.

R09-05C now includes the existing private content comparator in that snapshot and
reuses complete bounded authored-field selections with the dormant gift readers.
A trusted server-only acquisition guard wraps the existing reservation and creation
claim in bounded transactions. Re-read current source/mirror sale and content, then
write only their internal versions with timestamps disabled. Reservation/lease writes
use the same session, so competing edits retry and failed writes roll back together.
Do not accept this guard from a request or send its snapshot to the provider.

Recheck before provider creation, before returning a cached session, and after binding
an open provider response. If authority changes during the provider call, retain the
issued session and same attempt but withhold its redirect. A completed provider
response still binds for existing paid reconciliation; current sale terms cannot
erase collected-money evidence, refunds or learner grants. Provider calls stay outside
transaction retries. Native courses, Storefront products and downloadable Offers keep
their existing unguarded engine paths; these remain distinct workflows.

All 32 new local transaction/recovery checks plus three directly affected reader/route
checks pass first run (35/35, 29.139s); 49 unrelated cases excluded. Synthetic loopback
MongoDB/mocked payments only; account/I/O guards and owned cleanup pass. No test repair
or broad completed-suite rerun. This is not real HTTP/provider/browser/hosted acceptance.
The snapshot remains per-request, not persisted buyer content-version consent or a
historical content archive. A later request captures current matching content; existing
monetary/session fingerprints stay unchanged. Local fences are not atomic with remote
creation or later edits, and withholding a redirect does not cancel an issued session.
Expiry/cancellation, claim/delivery and release gates remain separate. Live gifting
stays OFF; plans/credits unchanged. No new schema/index, deployment or activation.

## Issued gift-session expiry boundary

R09-05D adds a dormant explicit recovery primitive, not an automatic response to a
failed course or consent read. A trusted server composition must authorize the exact
owned gift/attempt/session; request input cannot choose the Session or supply proof.
Only a stored, bound test-mode Session and matching provider configuration qualify.
Unknown/unbound attempts remain recovery cases; never search for or create replacements.

Retrieve the exact provider Session, verify its identity, money and private metadata
against the gift/reservation, then recheck authority and local payment state before an
expiry request. Keep provider I/O outside transactions, bound the request time, disable
transport retries and retain a stable expiry idempotency key. A provider reply or local
clock alone is not early-expiry proof: retrieve again even after an uncertain response.
Only confirmed expired/unpaid truth may close the same reservation through the existing
transactional state machine, preserving its original deadline and gift/receipt history.
Other checkout kinds and the timer-only expiry branch receive no new bypass.

Completed paid or delayed-payment Sessions remain with existing webhook reconciliation;
this path neither refunds, grants access nor fabricates a webhook. Paid local state must
win a race against expiry. Repeated/parallel recovery must retain the same identity,
and a failed local write must leave a retryable reservation rather than invent success.
Return only safe status/attempt data; no provider URL, recipient, secret or raw error.

Locally accepted: owner-approved 41 new isolated cases plus one directly affected
existing expiry case pass first run (42/42,65.529s;49 unrelated excluded). Synthetic
loopback databases and mocked payments only; account/I/O/owned cleanup pass, zero mongod
and unchanged source hashes. No repair or completed-suite rerun. The separate 05E
checkout-time composition below now has separate 38/38 local evidence. R09-05F below
adds authoring signals and per-course recovery with separate 41/41 local evidence.
Recovery scheduling, ambiguous unbound creation and actual provider/hosted/browser/native
acceptance remain separate. Public/live gifting and public expiry remain hard-disabled;
no ordinary checkout cancellation wiring, plan/credit change or release.

### Checkout-time withdrawal and same-gift recovery

R09-05E extends the existing reviewed checkout, not a second cancellation engine.
Before recording an obligation, reload the owned gift, retained buyer receipt and
exact bound test-provider reservation in one transaction. A fresh review must prove
changed/unavailable course authority or retained, explicitly revoked creator consent.
Missing consent, changed policy alone, failed reads, provider/readiness failures and
unbound ambiguous creation do not establish withdrawal. Validate the saved receipt
hash; request input supplies only the gift identity, never a Session or reason.

Persist one private first-write withdrawal marker on the gift before provider I/O,
with reason, time and the exact Session hash. Existing gift retention covers it;
no raw Session/recipient/terms in this marker, new collection, TTL or scan index.
The marker blocks both reviewed and low-level reuse of the withdrawn checkout,
even if course terms are restored. An explicit same-gift recovery can resume after
failure/restart through the accepted 05D primitive and its existing stable key.
Expiry confirmation still requires provider truth; paid races remain with existing
webhook accounting. Never treat a marker as expiry, payment, refund or access proof.

Owner-approved 38 NEW synthetic loopback/mocked checks PASS first run, 60.744s.
No repair or completed-suite rerun. Account/I/O/owned cleanup guards pass; zero mongod,
unchanged prepared hashes and backend HEAD verified. This bounded 05E evidence hooks
reviewed-checkout observations; the separate 05F writer integration below has its own
41/41 local evidence. No public route, automatic background processing, live/provider/hosted/browser/
native acceptance or release. Live gifting/public expiry OFF; plans/credits unchanged.

### Authoring signals and bounded per-course recovery

R09-05F connects existing Course document saves and updateOne/updateMany/findOneAndUpdate
authoring writes to an optional private generation/time/pending/cursor marker in the
same database write. Commercial source/projection transactions retain their existing
boundary. Consent revocation and supersession signal in the existing consent transaction;
replayed revocation does not replace a completed marker. No provider call occurs in an
authoring hook, and a rolled-back edit must leave no new marker. Questions, counters,
account fences, payment totals and recovery checkpoints do not signal authoring changes.
Document no-op saves do not signal; an explicit authored query update is conservatively
treated as a change even when its requested value already matches.

Gift reservation privately retains the course generation. Changed-then-restored content
cannot revive the old attempt; new reservations capture the current generation. Saved
buyer receipt and exact provider binding remain required. Positive persisted generation
drift may justify expiry even if current sale policy/consent reads cannot prove readiness;
missing policy/consent or failed reads alone still do not establish withdrawal. Keep the
accepted gift withdrawal marker, exact-session expiry and paid reconciliation engines.

The trusted internal per-course drain selects at most ten unpaid locked gifts plus one
lookahead and uses stored buyer identities, never caller-supplied sessions/cursors.
Checkpoint each accepted result using exact generation/cursor compare-and-swap. A newer
edit resets work and cannot be erased by an older drain. Uncertain outcomes retain the
pending checkpoint and original gift/session/key. Yield between records once the page
has spent 20 seconds; this is not a hard deadline for the current bounded operation.
Paid records are excluded; a completing payment remains authoritative, never refunded
or granted by expiry. Only private status counts leave this internal drain.

Owner-approved 41 NEW isolated loopback/mocked cases PASS first actual run, 61.207s.
Sandbox TEMP denial occurred before tests; same command succeeded outside sandbox.
No repair/completed-suite rerun. Account/I/O/owned cleanup guards pass; zero mongod and
unchanged nine prepared hashes/HEAD verified. Model/service evidence only. The separate
05G dispatcher/index work below has its own narrower local acceptance. No timer/worker
registration, public route, new service, index build or hosted migration. Hosted
query-plan/index review and dispatch activation remain release gates; maxTimeMS is not scalability evidence. Raw
collection/bulk/pipeline/replacement writers bypass these hooks and remain maintenance
review gates. No retroactive generation backfill. Local/uncommitted/not deployed; live/
public/native gifting and public expiry OFF, Facility gifts blocked, plans/credits unchanged.

### Indexed pending-course dispatch (R09-05G, locally accepted)

Reuse the accepted per-course recovery engine. The dormant internal dispatcher has no
timer, singleton startup, public route or environment activation switch. Each explicit
cycle may claim at most five due courses, using stored identities and a fixed bound;
it accepts no caller batch size, cursor, provider identity or course selection. Public
entry is hard OFF and internal use requires unchanged test-provider configuration.
The installed strict index comparator verifies both model declarations and actual index
metadata before any course claim. Missing, hidden, partial, sparse, reordered or otherwise
incompatible indexes fail closed; readiness never creates indexes or caches success.

Declare a Course pending/nextAttemptAt/\_id index and a Gift courseId/purchaseId/claimStatus/
\_id index locally, and explicitly hint the matching selector. Existing production-like
connection settings keep autoIndex/autoCreate OFF. No hosted migration is performed.
The optional private nextAttemptAt belongs to the existing change signal, not a new
queue collection. Null/missing legacy values are immediately due; new edits replace
the complete signal and schedule themselves. Preserve requestedAt and authored updatedAt.

Claiming persists a two-minute retry deadline before invoking recovery. An interrupted
or ambiguously acknowledged claim remains discoverable afterward. Retryable failures
defer that course one minute and permit other courses to proceed; a partial page is due
after one second. Checkpoints compare the exact claimed generation and deadline so an
older failure cannot delay a new edit. Existing per-gift proof and paid accounting remain
authoritative. The deadline is a retry reservation, not an exactly-once remote lock.
One dispatcher instance is single-flight; atomic due selection coordinates instances.
Yield between courses after 20 seconds; do not claim a hard deadline for an in-flight
bounded operation. Return aggregate counts/status only, never private records/raw errors.

Owner-approved 37 NEW synthetic loopback/mocked tests PASS first actual run,58.294s,
including equivalent read-selector explain checks with temporary indexes. Sandbox TEMP
denial preceded tests; the same command ran outside sandbox. No repair/completed-suite
rerun. Account/I/O/owned cleanup guards pass; zero mongod and unchanged eight prepared
hashes/backend HEAD. Static syntax/format/AST/whitespace checks pass. These local read
plans cannot certify hosted write plans, data volume, topology, migration or startup health.
Actual authoring-route/HTTP/browser integration, full startup/stop/readiness integration, deployment,
provider approval, unbound creation and raw maintenance-writer gates remain separate.
Live/public/native gifting and public expiry OFF; Facility gifts blocked; plans/credits unchanged.

### Dormant recovery lifecycle (R09-05H, locally tested)

The internal lifecycle factory wraps the accepted 05G dispatcher without replacing its
queries, indexes or expiry engine. At 05H it is disabled by default with no singleton,
env activation switch, server registration or HTTP route; 05K below adds only a
literal-disabled server registration. Public start stays hard
OFF. Even explicit internal start requires the same test-provider configuration before
and after each cycle. Each dispatched cycle retains the dispatcher's fresh index checks.
Use one completion-based 60-second poll, never overlapping interval calls. Initial
completion is required for operational readiness; retry-required results and failures
withhold readiness. A last successful heartbeat expires after three minutes, and
restart must establish a fresh heartbeat. Worker health never authorizes checkout:
activationAllowed remains false, independent of ready.

Drain cancels future polls and invalidates old callbacks. Allow an already-started
bounded batch to settle; never cancel an uncertain payment call or erase durable work.
Stop waits up to 7.5 seconds, then exposes draining if work remains. Restart cannot
overlap it, and late success cannot restore stopped readiness. This is bounded waiting,
not a guarantee that remote work was cancelled or that process termination is safe.
Return copied aggregate counts and fixed allowlisted error codes only; no raw logging,
provider details or private records. No public health endpoint is added.

Source inspection confirms existing native authoring routes use hooked Course writers,
Commercial projection retains its transaction, and dormant creator revoke delegates to
the transactional consent service. These routes are unchanged; inspection is not new
HTTP/authorization/browser acceptance. Owner-approved 33 NEW mock/fake-timer lifecycle
checks PASS first actual run,0.843s. Sandbox TEMP denial preceded tests; the same command
then ran outside sandbox. No repair or completed-check rerun. Blocked I/O and timer/env
cleanup pass; zero mongod and unchanged three prepared hashes/backend HEAD. Static
syntax/format/AST/whitespace also pass. No database, provider, email, real timer worker
or hosted action has occurred in that slice. The separate 05I evidence below composes
the real local database chain; full app shutdown/health integration and hosted release remain gates.
Keep live gifting/expiry OFF, existing plan/credit balances and all closed evidence intact.

### Local worker/database composition (R09-05I)

Reuse 05H/05G/05F and the existing reviewed-checkout/expiry engines unchanged. The new
suite composes those real services with an installed temporary loopback replica and
actual local indexes/transactions; payment responses are mocked and injected worker
timers are manually controlled. It does not mount the worker in app startup, open an
HTTP server, enable a public route or grant checkout authority.

Owner-approved 16 NEW integration checks PASS first actual run,39.684s. Accepted local
boundaries include native/Commercial changes and consent withdrawal, uncertain expiry
and claim replies, same-Session restart, index loss, drain/stop, concurrent workers,
newer generations, rollback, disabled composition, configuration drift and paid races.
No source repair or completed-check rerun. Account/I/O/timer cleanup guards pass; the
temporary replica is removed, zero mongod remain and prepared hashes/HEAD are unchanged.
Plans and credits are unchanged; live/public/native gifting and expiry remain OFF.

This evidence is not actual authenticated authoring HTTP/browser acceptance, process
shutdown safety, app health/startup integration, real provider behavior, hosted index
migration/scale or public release. Retain policy/provider/native/Apple, ambiguous
unbound creation, ordinary-checkout cancellation and raw maintenance-write gates.

### Authenticated authoring HTTP composition (R09-05J)

Reuse actual native and Commercial routers, bearer identity/account fences, dormant
private consent HTTP and the existing signal/recovery engines. The isolated fixture
uses synthetic JWT accounts and loopback HTTP/MongoDB; no test identity/plan headers.
Provider responses and injected worker timers are simulated. Authoring commits its
private signal without provider I/O; a later worker cycle expires the exact unpaid
Session. Denied requests preserve course/source/consent/reservation state.

Owner-approved 23 NEW checks PASS,53.728s, on the first actual runtime execution.
An earlier fixture email-import error stopped before any test/database; only the
fixture import was repaired. Native fee/unpublish/draft lessons/archive, Commercial
unpublish/draft projection and consent withdrawal have local HTTP composition proof.
Expired/missing/forged identity, wrong ownership, unavailable accounts, wrong source,
published edits, unconfirmed/foreign-origin withdrawal and failed saves stay closed.
Plan/credit/subscription snapshots, account-lease cleanup, zero purchases/earnings/
enrollments, blocked outbound I/O and owned server/replica/timer cleanup pass.

No runtime engine, route or server source changed. The fixture forwards async errors
and allowlists routes; it is not full app startup/readiness/shutdown, browser, process
interruption, hosted/provider/index/scale/migration or native/Apple acceptance. Those
gates and policy/unbound-creation/ordinary-cancellation/raw-maintenance gates remain.
Live/public/native gifting and expiry OFF, Facility gifts blocked; no deployment.
Keep earlier 05I worker/database and 05H mock-lifecycle evidence separate.

### Disabled server registration and diagnostics (R09-05K)

The server creates the existing recovery factory with literal `enabled: false`.
Environment flags, plans and requests cannot enable it; the disabled instance starts
no dispatcher or timer. Startup wiring checks database readiness and a generation
fence so old startup callbacks cannot restart recovery after shutdown. Exceptions
use fixed safe diagnostics, not raw provider/request data or monitoring payloads.

Existing `/ready` exposes an allowlisted recovery status with activationAllowed=false.
Missing, malformed, throwing, stale or draining status cannot advertise recovery
readiness. Recovery diagnostics are deliberately separate from global API readiness:
failed expiry must not take signed payment reconciliation offline. Preserve existing
database and ordinary subscription-refund readiness gates. Health is not permission
to create, deliver or claim gifts, and it does not establish provider/policy readiness.

Begin recovery drain before HTTP close. Await its bounded stop before database close;
unresolved work, rejected stop or unreadable final state produce an explicit failed
drain result/nonzero exit. Do not describe a timeout as clean completion or remote
cancellation. Durable work/uncertainty remain for recovery. No expiry engine changed.

Owner-approved 32 NEW local cases PASS first run,1.278s. Actual server functions and
ready handler, mocked app/DB/listeners/provider and fake process/timers only; no real
server/database/provider/email. No repair or completed-suite rerun. Blocked I/O and
timer/environment cleanup guards pass, seven prepared hashes/HEAD unchanged, zero
mongod. This is not unmocked app boot, real signals/crash recovery, hosted/index/scale/
migration/provider/browser/native/Apple or policy acceptance. Those gates remain,
alongside unbound creation, ordinary cancellation and raw maintenance writers.
Live/public/native gifting and expiry OFF; plans/credits unchanged; no release.

### Full local application process boundary (R09-05L)

One owner-approved boot/restart/shutdown scenario passes using two sequential real
server-main processes, actual application/routes/workers, installed temporary MongoDB
and loopback HTTP. Both serve /ready and health with recovery registered but disabled,
no recovery dispatcher, all gift capabilities OFF and telemetry OFF. Existing shutdown
handlers close real HTTP/database connections and exit0; the database stays empty.
Owned processes/data are cleaned. PASS1/1,52.197s. Fixture-only driver, cold-start
deadline and numeric-loopback guard corrections preceded acceptance; no application
change or completed-suite rerun.

This is development-mode evidence. The fixture constrains wildcard binding to loopback
and redirects legacy upload folders to owned temp; no provider/email credentials or
outbound access. Windows IPC dispatches the real SIGTERM/SIGINT handlers, not actual
OS signals. Do not infer production config, Render signals, crash/kill recovery,
enabled expiry, other route journeys, hosted indexes/scale or provider/policy/native/
Apple acceptance. Live gifting stays OFF and plans/credits unchanged. Remaining
release/activation gates require scoped review, not automatic deployment or activation.

## Disabled course gift interface

R09-04Y extends the existing reservation and creation transactions with a Commercial
source write fence. Re-read only sale fields in the caller's real transaction, apply
the 04X identity/publication/visibility/amount rules, then increment the source's
internal version without changing authored payload or public updatedAt. A competing
source edit after the snapshot must conflict and invoke the existing bounded retry;
the fresh transaction must reject changed sale authority. The source fence commits
or rolls back with the existing gift, reservation, buyer receipt and creation lease.
Native courses do not read or write Commercial sources. Do not apply this new-sale
fence to already-paid reconciliation, refunds or learner delivery.

The owner-approved 26 new isolated transaction/recovery cases pass on their first
run (37.127s), using installed local MongoDB, synthetic records and mocked provider
responses. Source-edit races, rollback, same-attempt recovery and affected native/
already-paid compatibility are locally accepted; no source/test/config repair or
completed-suite rerun. Account/I/O guards and owned cleanup pass, with zero mongod.
Full source/mirror lesson-content revision agreement, ordinary acquisitions, issued
provider-session expiry/cancellation and browser/native/hosted/provider acceptance
remain separate gates. No live gifting, plan/credit change or release.

R09-04X adds a read-only Commercial sale-source prerequisite to the existing dormant
gift reviewer. Reuse the current exact projection identity/owner, publication,
visibility and cents/legacy-dollar mapper; a shared mirror alone is insufficient.
The source must be an undeleted published public/unlisted course, and its positive
safe-integer amount must equal the already-validated gift intent amount. Never select
one conflicting price, repair a record, create consent or grant access from a review.
Read only source sale fields with a five-second database limit, forwarding the
caller's transaction context. Re-read after seller preflight under the existing
20-second outer deadline. Bind normalized source identity/owner/visibility/amount
into the existing review fingerprint so changed source terms require a new review.
Native review fingerprints and Facility gift denial remain unchanged. Source data
stays private; failures use existing generic review codes.

The approved 24 new in-memory/mock checks pass on first run (0.995s). This establishes
review/helper behavior and mocked session forwarding, NOT real database transaction
integration or a source write fence. Reviewed reservation/checkout readers include
commercialRecordId and forward their existing session; 04Y above supplies the
separate local source-fence transaction/race evidence. Full source/mirror content
revision agreement and ordinary purchase consistency
remain separate gates. Do not apply today's source price to already-paid
reconciliation, refunds or retained learner grants. Live gifting remains OFF;
plans/credits unchanged, no provider call or release.

R09-03F adds a dormant authenticated web host and same-attempt reload recovery.
The host subscribes to existing auth, entitlement and Facility state, removes old
forms immediately and disposes/cancels their requests on account/token/course/
workspace/role/verification/readiness changes. Mounting, reloading and signing in
never submit a gift request. The default host and public/native entry remain OFF.

The existing continuation may retain strict, account/course-scoped opaque buyer
attempt or creator-request IDs and consistency fingerprints for one local hour.
Never persist recipient email, terms, price, credential, invitation token or checkout
URL. Hints do not grant access or payment authority. Do not extend their deadline
on reads. Corrupt, expired, conflicting or unreadable storage blocks new writes;
status may still use a valid original opaque ID. Storage-write failure is visible
and retains only the current in-memory attempt. Cross-device and completely lost
storage recovery require separate evidence; the future entry must supply a stable
original attempt and must not generate another on mount.

An uncertain reservation first requires an explicit status check. If no gift ID
was established and status remains unreadable, permit re-entry of the original
recipient and a fresh server review. Only unchanged confirmed material permits a
new unchecked confirmation and resend of the original reservation through the
existing idempotent server coordinator. Never infer no payment from a failed read.
Once a gift is known, bind it before caching status and recover checkout separately.
A new status read discards outstanding retry confirmation. Recheck stored identity
and expiry immediately before writes so another open form cannot replace an attempt.

An uncertain creator save retains its original request and expected consent revision.
Require current matching policy and fresh explicit confirmation before retry; do
not silently substitute a request on policy rotation. A revoked replay stays revoked.
Clear only the matching marker after a bound success. Resolve an ambiguous save
before a different mutation; lost revoke uses a current read and explicit retry of
that consent reference. Expired/conflicting hints need support resolution, not an
automatic new consent or payment. All server authority checks still apply.

Local F evidence: 51 distinct new recovery cases accepted across 45 initial passes
and six added edge cases passing with 45 skipped; one affected E binding privacy
case passed with 40 skipped. Synthetic mocked auth/UI/storage/transport only, not
actual browser/HTTP+database or provider acceptance. H above resolves the inherited
TS diagnostics. G adds locally accepted consent/receipt retention barriers; preserve
policy/provider/index/Facility/delivery/diagnostic/proxy/hosted/native/Apple and
issued-session cancellation/expiry gates. Plans and credits are unchanged.

R09-03E binds internal web creator and buyer screens to the existing protected
client and saved-consent/review/reservation/checkout engines. Public/native entry
and all live gifting remain OFF; no route or env flag mounts this composition.
Creator review is owner-only and read-only. Missing approved policy disables new
opt-in without hiding revocation of current consent. Display approved creator
terms, require explicit unchecked consent or revoke confirmation, and re-read after
an uncertain result. Reuse the same save request for unchanged material; a revoked
idempotent reply must never be shown as enabled consent.

Buyer review comes from the server for the exact course, attempt and normalized
recipient. Show all approved terms including refunds and the saved price. Recipient
edits invalidate confirmation. Explicit confirmation reserves the reviewed gift;
a separate deliberate action asks for checkout using the saved receipt. Unknown
reservation outcomes retain the original attempt for status-only recovery. Unknown
checkout outcomes require status before same-gift recovery. Never infer payment,
inbox delivery, learner access or payout from a redirect or creator consent.
Reject stale session replies/forms and mismatched gift IDs before caching. Accept
only the exact bound open-checkout response with a reviewed HTTPS provider URL.
Never store recipient, terms or checkout URL in browser storage; the existing
optional opaque-attempt recovery remains account-bound and discloses failure.

New sale operations extend the dormant origin/bearer/quota boundary with exact
canonical multi-field JSON bodies within the same 1 KiB limit. Reject duplicate
keys, extra identity/amount fields, alternate escapes, malformed UTF-8 and nonliteral
confirmations; old one-field recipient/status parsing stays intact. Reuse existing
transactions, not a parallel payment ledger. No provider/content approval defaults
or customer terms are invented.

Local evidence: 33 backend cases and 41 distinct frontend cases accepted across
recorded targeted runs after repairing a first-status identity-cache defect. Only
synthetic in-memory/mocked data and a closed loopback HTTP server; no database or
actual provider/email. The inherited frontend type diagnostics are resolved by H.
F above supplies the separately accepted local host/reload/same-attempt recovery
closure, including an uncertain reservation that never appears in status. G adds
local retention/removal barriers, not an approved disposition policy. A rerender
guard alone is not an auth subscription.
Actual HTTP+database/browser/compiled
monitoring, policy/provider/index/Facility/delivery/native/Apple and issued-session
cancellation/expiry gates remain separate. This is not public feature acceptance.

R09-03D2B2 connects the saved buyer-review receipt to the existing provider-creation
runtime through trusted transaction/return hooks. Require the exact owned gift,
receipt, reservation and current confirmed material. Fresh seller preflight runs
outside transaction retries; receipt and policy/consent write fences join the
existing account/course creation transaction. Recheck current local authority
before provider creation or returning an open session and after a provider response.
Uncertain outcomes keep the original attempt/idempotency key; private receipt
material must not enter provider metadata, responses or diagnostics.

Withhold a redirect if authority changed during the provider response, but retain
that exact session for reconciliation. Already-paid reconciliation remains separate
from new-sale consent: a later withdrawal cannot erase collected money. Local
authority and remote creation cannot be atomic, and an already-issued provider URL
is not canceled by these checks. Provider-session cancellation/expiry policy remains
a release gate. Internal freshness limits are not customer gift-expiry terms.

The approved new suite passed 51/51 using synthetic loopback data and mocked provider
responses; cleanup and network/plan/credit/lease guards passed, with 0 mongod left.
Existing runtime hooks were covered in that new suite without repeating old tests.
This is local integration evidence, not actual provider, browser or hosted proof.
Public gifting remains hard OFF/unmounted. E supplies local screen binding above;
actual approval, indexes, retention/removal, Facility/delivery/diagnostic/hosted/native
gates remain separate. No plan or credit changes follow from this integration.

R09-03D2B1 adds an unmounted reviewed-reservation coordinator. It confirms the
exact existing buyer review, reuses its provider preflight result outside database
retries, and rechecks current transactional course/account/policy/consent facts and
local provider approval/readiness. Policy/consent and existing course/account write
fences protect the reservation. The gift, existing reservation and immutable private
buyer-review receipt must commit together or all abort. The approved new loopback
suite accepts 48 distinct cases: initial 47 PASS/1 clock-fixture failure, then only
the corrected case passed with 47 skipped. No model/service repair. Temporary
database cleanup completed; network/plan/credit/lease guards passed. This is local
synthetic transaction evidence, not provider, browser or hosted acceptance.

Preserve the exact confirmed quote/terms, recipient, price, approval/consent references
and server timestamps. Never rewrite a prior receipt, add retrospective consent to
an unreviewed attempt or expose its private material in ordinary serialization,
responses, provider metadata or logs. A matching request records explicit acceptance,
not proof of screen viewing. Same-attempt recovery retains the original receipt;
current revocation and material changes still block new reservation work. The
20-second consumption limit is an internal freshness guard, not a gift-expiry term.

This boundary does not create a payment, enroll, email, mount HTTP or enable UI.
D2B2 supplies separately accepted local provider-creation/recovery enforcement above;
E supplies local UI binding above. Receipt and creator-consent retention/removal, actual
policy/provider approval, declared-index verification and hosted acceptance remain
separate gates. No plan or AI-credit changes follow from reservation.

R09-03D2A adds locally accepted versioned policy and creator-consent persistence,
still unmounted. Current terms require explicit reviewed text, reviewer
and freshness; nothing is approved or seeded automatically. Owner opt-in and revoke
require transactions, current ownership/account fences and exact revision-aware
requests. Publication, media rights, account plans and payout setup are not consent.
Old consent revisions remain; retrying an old attempt never re-enables a revoked
revision. Revocation does not require the policy to remain current or the course to
remain published. A newly available stored-loader adapter feeds the D1 reviewer.

Its approved temporary-loopback suite has 47 distinct accepted cases: initial
46 PASS/1 incorrect expectation of silent immutable-field handling, followed by
the corrected rejection case passing alone with 46 skipped. Models/services were
unchanged. Cleanup completed, no mongod remained, and network/plan/credit/lease
guards passed. This is synthetic local persistence/race evidence, not a real
creator decision, policy approval, provider call or hosted acceptance.

Policy/consent write fences are consumed by the new D2B1 reservation coordinator;
D2A alone is not a payment permission or buyer-consent receipt. Caller-owned errors
must abort the transaction. Actual policy approval, provider approval, declared
index verification, consent/receipt retention/account removal and creator/buyer UI
remain gates. D2B2 supplies local creation-time consumption, not hosted approval.
No plan/credit, actual provider or public changes.

R09-03D1 adds an internal read-only sale reviewer, not checkout creation. It
requires fresh acquisition readiness, approved gift terms including refund text,
course-specific creator opt-in and separate provider/content approval. It reuses
existing course/account/saved-price and seller-preflight engines; publication,
lesson rights and payout onboarding are not gift opt-in. Its default loaders still
block; the separate D2A adapter uses the new stores. Test mode only; public entry is
hard-disabled and unmounted.

Recipient, attempt, current price/title, terms, consent and provider destination
are bound and re-read after preflight. Confirmation reloads authority and requires
explicit acceptance of matching review material. Its fingerprint is a consistency
check, not a bearer authorization, evidence of a prior visit or atomic reservation.
No recipient-account lookup, consent persistence, charge, email or enrollment is
performed. A 20-second outer deadline rejects stalled work and stops later stages.
The approved in-memory suite has 80 distinct accepted cases across an initial
79 PASS/1 test-fixture failure and a corrected-case pass; no old suite rerun.
This D1 evidence is not provider, database or hosted acceptance. D2A persistence
and later transactional consumption/UI/checkout binding have separate evidence.

Course gifting is separate from subscription gifts, plan limits and AI credits.
The local R09-03A buyer and recipient panels are unmounted building blocks, not a
public feature. The entry returns nothing regardless of caller flags. No course
detail button, checkout route, token storage, API adapter or native payment flow
is enabled by these panels; ordinary course purchase and enrollment are unchanged.

The buyer reviews the exact recipient email, saved course price and supplied
approved terms before an unchecked consent control can enable an explicit action.
No default expiry, duplicate-access or refund policy is invented. Aliases are not
collapsed. An uncertain reply permits only a status read for the same attempt,
not another payment. A payment record is not delivery, recipient access, buyer
enrollment, a final refund state or a settled seller payout.

The recipient sees only a masked address and public course preview. Signing in
does not claim; mismatched, unverified, blocked, expired or unknown states cannot
claim. An explicit claim requires a bound gift/course/enrollment reply before a
course-opening action appears. Failed or mismatched replies require a fresh read,
never automatic claim replay. Course opening still checks current authorization.
Account/session/course/quote/terms changes reset local review and discard old
replies; the future controller must include fresh authority in its scope identity.

R09-03B1 adds an unmounted continuation and internal request controller. Only an
exact 64-character lowercase-hex fragment on `/claim-course-gift` is admitted,
after removing the fragment and query from browser history. Tokens remain in
instance memory for at most 15 minutes, bind to the first settled sign-in, and
clear on a later account/session change or sign-out. Reload requires reopening
the original invitation. This local memory limit is not a gift-expiry policy.
An optional account-bound recovery record holds only an opaque checkout attempt
for one hour, never the email, claim token, credential or payment instruction.
Return/cancel links grant nothing; recovery reads the original attempt only.

The internal controller permits one explicit request at a time with a 20-second
total budget including credential retrieval, abort on disposal, zero retries,
no-store and redirect-error transport requirements. It rejects stale session
replies and changed gift identities, projects only allowed response fields, and
requires fresh review and explicit confirmation for a claim. Uncertain claims
need a new read rather than automatic replay. No checkout creation is wired.
The public client and native path remain hard-disabled.

R09-03B2 adds an unmounted authenticated HTTP adapter and server response boundary.
The server resolves bearer identity, reloads the current accounts/course/payment
and enrollment under a transaction, and returns only the combined masked preview
and eligibility code. It resolves claim/recovery tokens by hash and rejects
ambiguous cross-column matches. Claims reuse the existing fenced transaction and
require an explicit server replay policy; a browser cannot set its expiry or actor.
Buyer status resolves only the signed-in buyer's original checkout attempt using
the existing reservation binding. Review does not grant access or write records.

The HTTP boundary accepts only exact POST JSON paths and the one allowed body
field. Tokens never enter query strings; cookie/test-header/body identities are
not authentication. Error responses omit private details, and all responses are
no-store/private/noindex/no-referrer. The frontend reuses apiRequest with explicit
authorization, no retries/redirects, no global sign-out or transport notification,
and no AI-balance event. Ordinary request balance notifications remain unchanged.
Public server/client entry points stay hard-disabled and the handlers are not
mounted. Local bearer/DB tests and mocked-fetch tests are not hosted HTTP proof.

R09-03B3 adds private web route shells, an internal root-owned journey and screen
bindings. The public root boundary is inert; without the internal context both
routes show unavailable and send no gift request. No environment, query, plan or
Admin flag opens the boundary. Native remains closed. The internal journey holds
the invitation through only its deliberate exact same-tab login return; leaving,
reloading, replacing a resolved session or losing its verified state requires the
original invitation again. The shared login allowlist accepts only the bare claim
path or a strict checkout-attempt return, never a token or arbitrary destination.
Signup continuation is not broadened. Signing in never claims or purchases.

Review, claim and same-attempt payment-status reads remain explicit. The existing
recipient panel handles claim/recheck; ordinary course opening rechecks access.
Only a successful buyer-authorized status read saves the opaque recovery record;
blocked browser storage is disclosed. Read errors cannot imply zero payments,
delivery, access or authorization for a second payment. Auth transitions reset
the private UI and cancel stale work without global sign-out or balance events.

Both export and SPA metadata use private generic text, noindex/nofollow/noarchive,
no canonical or share URL, no public schema and no-referrer. Leaving the SPA
route restores the prior referrer policy. Marketing analytics already excludes
these routes. Source preparation and mocked-export tests are not served HTML or
browser acceptance. Monitoring privacy has the separate local safeguards below;
do not infer compiled SDK or native privacy acceptance from marketing exclusion.

R09-03C1 adds a locally accepted but unmounted server security wrapper around the
existing HTTP/access engines. Require exact reviewed HTTPS origins and bearer-only
identity; reject native/no-Origin requests. Only strict preflight and the exact
POST routes are admitted. Authenticate before parsing at most 1 KiB of uncompressed
canonical one-field JSON; reject duplicate headers/keys, extra fields, escapes and
pre-parsed bodies. Per-process quotas are 60 requests/IP and 30/authenticated actor
per minute, independent of the ordinary global rate-disable/minimum settings.
Never key limits by an invitation token or trust caller account/workspace hints.

Shared request logging suppresses private gift URL details and account/caller IDs;
private parser errors never enter ordinary body/stack diagnostics. Late private
errors close the response instead of forwarding raw exceptions. Local HTTP evidence
uses mocked identity/access; it does not prove the actual proxy or mounting order.
Memory quotas are not fleet-wide protection and reset with process lifetime.

R09-03C2 filters private gift diagnostics in both Sentry initializers: errors,
transactions, outgoing breadcrumbs and structured logs. App-owned captures stop
before adding extras. Current browser URLs are checked before React mounts and
after route changes; retained URLs, token-like strings and exception causes are
checked again when a delayed event is processed. A private server request retains
only a boolean async context, not its URL, body or identity; concurrent ordinary
requests keep their diagnostics. The existing HTTP integration excludes gift
request bodies and HTTP spans before Express parsing.

The shared frontend logger, affected auth/capability logs and both error boundaries
use the same policy. Private error state/messages are generic; ordinary error
reporting remains available. Scanning is bounded and rejects uncertain graphs,
custom property getters and serialization. The engine's exact Error.stack getter
is allowed after checking name/message accessors; supplied stack getters are not.
This is intentionally conservative: unrelated 64-hex digests, oversized payloads
or objects with custom accessors may also be suppressed. It is not a universal
personal-data classifier or a monkeypatch of every framework/native console.

The new local suites accept 28 backend and 35 frontend cases across recorded
runs after repairing over-suppression of ordinary engine error stacks. Actual
Sentry transport/envelopes, native crash/session diagnostics and compiled device
behavior remain release gates. Monitoring DSN/sampling/session defaults and user
analytics consent are unchanged; this work does not enable monitoring or gifting.

Before activating the internal boundary or mounting the server handler, verify
compiled diagnostic privacy, actual pre-CORS/parser/logger mounting and proxy trust,
and review approved policy/consent/readiness, real browser routing/history behavior
and the remaining release gates. Marketing exclusion alone is insufficient.
The internal owner observes auth transitions and disposes its continuation on exit.
No raw token is passed to panels, logged or persisted. Local synthetic tests are
not browser/native, real-payment, inbox, cross-device or hosted acceptance.

### Prepared staging web composition (October 20, 2026)

The staging integration candidate's ordinary web root now selects the existing
prepared staging wrapper at the same provider/route position. Production and native
remain inert. The wrapper reuses the existing entry, sale host, recipient/login
continuation and quiet HTTP adapter.
It admits only the exact recorded staging website and staging API URL. These
client checks prevent accidental routing; they do not establish identity, policy,
provider permission, payment or access. The existing server gates remain mandatory.
Selection is a reviewed source import, not a URL, storage, account-role or public
activation switch. The existing test-only loopback entry restriction is unchanged.

Staging context creation reads no credentials/storage and makes no request.
Actual requests keep the canonical private paths, bounded timeout, zero retry,
no-store/redirect-error and balance/sign-in/transport silence. Context is checked
before and after transport. Closing aborts pending work; mismatched context
cannot accept a late reply or reopen itself. Unmount/pagehide closes the binding;
returning from bfcache requires a fresh page rather than automatic recovery/send.
Transport replacement also replaces the existing private continuation and forms.
Course/account/workspace eligibility, original attempt recovery, privacy scoping,
security-link scrubbing and checkout URL allowlisting remain existing controls.
There is no new payment engine, authentication store or private persistence.

The 36 new synthetic tests and two directly affected fallback cases passed locally
under scoped owner approval on October 20. A cache permission error preceded test
execution; the bounded workspace cache resolved it. One fixture cleanup expectation
was corrected to leave the private URL before expecting diagnostics suppression to
end; only that failed case reran. No application repair was needed during testing.
The subsequent normal-root selection has nine new/directly affected checks passing:
no mount request/ID/storage/account mutation, production/API/native exclusion,
pending recipient capture, session replacement, and pagehide/late-reply closure.
Twelve unrelated wrapper cases were excluded; the completed browser journey was
not rerun. Local component evidence, joined browser evidence and hosted/source-pair
release remain distinct. No hosted selection or worker activation occurred.
Plans, credits, consent settings, retention/deletion/archives and policy review
decisions remain unchanged.

On October 20 the owner selected a fifteen-minute same-recipient confirmation
recovery window after a successful claim. The original matching link can recover
that result only through the existing authenticated claim/payment/access checks.
This does not extend the security link, expire the gift, grant new access or select
record retention. The seven-day security-link lifetime, no automatic gift expiry
or inactivity fees, and manual refund-review policy remain separate.

The staging backend candidate's normal startup now selects the existing prepared
application only for the pinned staging service, staging web origin and staging
environment; the existing constructor independently rejects live/mock provider
configuration and fences later changes. Other roots keep the ordinary application.
One composition owns both literal-OFF workers. Current, same-database gift-index
metadata is combined with existing payment readiness for new acquisition only;
missing, expired or rebound evidence fails closed. Gift metadata inspection does
not delay shared payment refresh or close signed-event servicing. Shutdown fences
intake, rejects late startup/readiness completion and drains before database close.
The provider-approval reader deliberately returns unavailable until separately
reviewed evidence/source is configured; neither a test key nor seller onboarding
is permission. Nineteen new mocked normal-startup/readiness/shutdown checks passed
locally, not a hosted boot or real-provider certification. Public capabilities,
workers and live gifting remain OFF. The source selection itself is not deployment
or authorization to execute hosted gift requests.

## Existing course workflows

Personal More groups existing creator tools without a new role or signup. The
shared catalog, video library, Live Studio and Personal Billing accept only the
first exact `from=personal-more` marker for Back to `/home/personal/more`, including
after reload; other sources keep ordinary history and their existing fallbacks.
This uses existing Back controls, never an arbitrary redirect, and does not alter
the Full Course Builder's separate source allowlist or any entitlement. Billing
remains optional eligible paid-sales setup, not creator activation. Navigation
does not create, publish, upload, connect a provider or broadcast.

Course video is a lesson resource, not proof that GrowPath owns, hosts, continuously monitors, or can measure viewing at a third-party provider. The authoring contract is shared by Personal, Commercial, and Facility educators.

Published course imagery follows one learner-facing hierarchy across workspaces. Catalog and feed cards may show a compact thumbnail, cover, or banner when the author supplied one; they must not manufacture a generic course image when none exists. The opened course shows one full-width hero image, preferring the dedicated banner and otherwise reusing the best saved cover or thumbnail. Do not render both a banner and a duplicate cover in the same overview. Missing optional imagery leaves a deliberate text-only layout rather than a broken or unexplained gap.

Course authoring uses one page-level heading, ordered level-two builder steps, one route-level Back action, and named pricing or access radio groups with an exposed checked state. Do not make keyboard or assistive-technology users choose between duplicate Back controls, navigate a flat list of page-level headings, or infer the selected course price or access mode from color alone. User-facing course cards and access choices use readable labels rather than raw stored values.

The shared Full Course Builder must create the record in the active workspace's canonical course collection. A Commercial author therefore creates through the Commercial course endpoint so the new private draft immediately appears in Commercial Courses and retains the Commercial detail, lesson, publish, unpublish, and archive lifecycle. Personal and Facility authoring retain their authorized course paths. Returning to a workspace route with an ID created in a different course collection is a failed handoff, even if the initial create request returned success.

Commercial course persistence stores a flat canonical grow-interest tag list for catalog and detail use. The shared builder may retain its structured tier selections separately, and Commercial readers must normalize legacy structured selections instead of rendering object text or failing the page.

Commercial authoring remains the source of truth while a same-identity shared Course projection serves learner discovery, protected delivery, enrollment, checkout, refund, and payout workflows. Create, edit, lesson, publish, unpublish, and archive operations must update the Commercial source and projection in one transaction; generic Course-authoring endpoints must reject that projection. A guarded backfill must stop on identity collisions or unverified paid sellers before writing. Carry all structured grow-interest values into the projection, and apply the cannabis content label only from an explicit cannabis flag or exact structured crop, interest, tag, or content-label value—never by scanning a title, description, lesson, or other prose.

The shared public Course response must not disclose a Commercial owner or account ID, or unresolved Product, Grow, or Live workspace record IDs. Preserve those links on the owner record, and expose a destination only after its public projection resolves and independently authorizes the route. A public Storefront course may therefore resolve published product destinations while a general learner Course response omits unresolved private authoring references.

The parallel Commercial catalog and storefront course list are discovery previews,
including for free courses. Return module/lesson identity, title, order and counts,
not raw learning bodies, documents, video URLs, assessments, tasks or author notes.
Retain a linked product ID only after resolving a published, non-hidden product in
the same published storefront with the same owner. Other operational links stay
private; this does not change the author record or authorized learner delivery.
Reuse the source's existing publication and visibility mapping: private and
Facility-only sources have no public preview; unlisted (including legacy followers/
customers) stays out of directory discovery but may have a metadata-only direct
share. Share authorization precedes image rendering. Failures remain errors; GETs
never backfill a canonical course or grant learning/payment access. This boundary
does not certify source/mirror prices or content versions, same-ID catalog precedence,
unlisted storefront-page lookup, third-party cache recall or hosted acceptance.

The Storefront course landing uses an exact-ID, metadata-only direct reader for
saved course IDs, separate from public directory discovery. Reuse the same published
store/source, owner, visibility, outline and public-product resolution controls.
Return no raw storefront/source, learner grant or canonical backfill; responses are
noncached. The page must bind returned identity, storefront and publication before
showing actions, never fall back to directory data after direct denial, and discard
superseded or unmounted reads. Keep legacy public title/slug aliases directory-only.
Retry performs one read, not checkout. The anonymous direct transport is bounded,
balance-silent and cannot invalidate sign-in. Existing learner/payment controls
remain authoritative. R09-04V has 10/10 isolated API and 20/20 mocked component/
transport checks passing locally (October 16, 2026). This is not browser, hosted,
native, payment, content-version or full course-gifting acceptance.

Shared catalog, search, recommendations, categories and tags must also bind a
Commercial projection to its exact current source before exposing metadata or
counting it. Both records must be published and publicly discoverable; a missing,
withdrawn, private, deleted or differently owned source is not a public catalog
entry. An unlisted source stays out of discovery but retains an otherwise valid
direct share. Share HTML and image handoff recheck that same source authority
before rendering. Failed source reads are errors, not successful empty/partial
results. Filter before pagination and totals, retain valid native course results,
and carry the current source-paid classification without silently repairing prices.
Read bounded batches and close cursors; these reads must not write either record.
This does not certify positive-price/content-version agreement, recall third-party
cached copies, change learner grants, enable gifting, or establish hosted/load proof.

When the shared catalog combines public, owned and Commercial responses, select one
complete record per saved identity instead of merging fields from different sources.
The shared learner response outranks the parallel Commercial preview, including its
explicit unavailable price, outline, visibility and learner-detail destination. The
authenticated owned response retains its separate authoring view and outranks public
records; do not import public publication, pricing, lessons or storefront routing
into a private draft. A Commercial-only entry retains its existing storefront route.
Preserve stable list order, partial-source warnings and explicit read retry. Leave
same-authority Facility and requested-detail merging unchanged. This selection is
not a fresh source-version or checkout authorization check, nor permission to write
records. R09-04W has 15 new mocked checks passing locally on their first run;
server price/content-version agreement, acquisition and hosted gates remain separate.

For shared Commercial catalog/detail responses, compare the exact bound source's
effective positive amount with the mirror's effective positive amount using the
existing cents/legacy-dollar rules. If both are positive but differ, public amounts
are unavailable (`price` and `priceCents` null), while paid classification remains.
Do not choose either amount, advertise Free, rewrite records, revoke an existing
learner grant or hide otherwise authorized lessons solely for this price conflict.
The exact author's existing stored-price preview remains separate. Matching positive
amounts and equivalent legacy-dollar amounts keep their saved presentation.
This is a public read/display safeguard, not checkout/review authorization, complete
price validation or content/version proof. Shared and category catalog cards reuse
the same price-label helper as shared/public Storefront details. Free-only discovery
admits only the helper's ordinary Free state; paid or unavailable amounts are not
Free. Category cards retain their existing paid-discovery capability gate for every
non-Free state, including cents-only and marker-only paid records. With the capability,
opening details still performs no enrollment or payment and grants no lesson access.
Facility cards keep the server-scoped list and permissions. Saved amounts, source
precedence, direct-return authorization and pricing/checkout engines are unchanged.
R09-04T accepts this UI dependency locally with 22 new mocked component checks after
reproducing the label/filter failures. No closed suite was repeated; the unchanged
shared helper is reused. Component evidence is not hosted/native-route or visual
evidence, source-precedence certification, or authorization to release the paired
response change or activate gifting.

The shared course catalog loads public, owned, and Commercial-public sources independently with an outer bounded total operation time and no hidden automatic retry extension. The outer deadline includes authentication-token retrieval as well as network and response parsing. One unavailable source must not leave the whole catalog loading forever or discard fulfilled sources; show available courses, disclose the partial result, and provide a named retry action.

Catalog loading depends on stable authenticated identity values, not a whole session-user object whose reference may change during rendering. Course-result state updates must not retrigger the same catalog load indefinitely.

The Full Course Builder's single route-level Back returns to its explicitly supported entry point (Commercial Courses, Commercial Storefront, or Personal Courses), even when router history skips that page or the builder was reloaded. Accept only these exact source paths and the first query value. An absent or unsupported source retains ordinary history with the existing Personal Courses fallback; arbitrary URLs must not become return destinations. This navigation does not create, save or publish a course or change workspace authorization.

The Commercial author-course list distinguishes unknown counts from confirmed zero, and only reports no courses after a successful current read. Failed reads provide a single-flight Retry without clearing the unfinished form; previously loaded records and counts remain explicitly labeled during refresh or failure. Product Line choices are optional and fail independently with visible feedback, without changing typed draft links or hiding successfully loaded courses. Read recovery does not create, enroll, publish, upload or charge.

## Source selection and normalization

Saved native lesson editors must re-read the exact course and server-confirmed ownership before rendering a form. Published lessons require explicit unpublish; the server must also reject a mutation if publication, archive or ownership changes between read and save. Changing course/lesson identity clears the previous editor immediately and rejects superseded reads. Failed reads offer Retry, and Back accepts only an exact supported course-list origin or the selected course's detail path. These guards do not change pricing, enrollments, or published content automatically.

Course Analytics uses the creator API's saved `id` (or legacy `_id`) for selection. Failed or malformed list/detail reads offer named Retry controls and never imply an empty collection or zero totals. New selections clear old metrics and reject superseded responses; repeated selection during a pending read is single-flight. A lesson-only analytics response displays lesson metrics with course totals explicitly unavailable, not invented financial zeros. Back from the exact Commercial Courses entry returns there, including after reload; unsupported origins retain the shared safe fallback. These are read-only behaviors and do not alter payment, enrollment, or metric calculations.

Authors choose one source type: GrowPath upload, YouTube, Rumble, Vimeo, or Other video URL. Detect YouTube, Vimeo, and Rumble from recognized video-page URLs even when the author initially chooses Other. Preserve the submitted URL for traceability and store a separate canonical URL, provider video ID, Vimeo unlisted privacy hash when present, provider label, thumbnail when deterministically available, embed capability, external-link fallback, privacy mode, and last availability-check time.

The initial Course Builder and later Add/Edit Lesson screens use the same provider-aware media contract. Authors may attach and review lesson media while outlining a new draft or defer it until lesson editing; no initial-builder shortcut may bypass URL normalization, rights, availability, accessibility, learner-summary, embed, or fallback fields.

Authors may also attach an existing video from the Personal, Commercial, or Facility workspace library by storing its `videoAssetId` with the normalized lesson media snapshot. Detaching the video from a lesson must not delete the reusable library asset. Removing a library video must be blocked while any course lesson still references it so an author cannot silently break a published or draft course.

Accept HTTP(S) video-page URLs, legacy first-party `/uploads/` paths, and protected first-party `/api/videos/uploads/` asset paths. Reject iframe, script, object, embed, video, HTML, `javascript:` and `data:` input. Never store or execute author-supplied embed markup. A provider not covered by a reviewed embed contract remains link-only.

## Author review and publishing

A course-level thumbnail and banner are optional presentation media. When supplied, use
the thumbnail for compact catalog/storefront cards and the banner once as the learner
page hero; do not duplicate the same asset as multiple learner-page heroes. Authors may
deliberately clear either image, and that removal must survive save and reload. Missing
course-level imagery may remain a quality recommendation, but it must not by itself
block publication. Lesson-level media continues to follow the evidence, rights,
availability, accessibility, summary, and fallback gates below.

A draft may retain incomplete media so an author can return to it. Publishing or approval is blocked when a lesson with video lacks any of:

- creator ownership or permission confirmation;
- an author-recorded availability status and check time;
- captions or transcript status;
- a learner-visible text summary; or
- an external-link fallback.

The author must open the source before recording availability. Record available, link-only, restricted, or unavailable plus an optional note for login, age, region, domain, privacy, removal, or embedding limits. This is a timestamped author check, not continuous GrowPath monitoring. A successful GrowPath upload may record first-party availability and check time automatically, but it does not waive rights or accessibility review.

An authenticated course owner uses explicit Publish Course and Unpublish Course actions. The publish action must first save the current on-screen draft, then apply server-enforced course, access, payment, and media checks to that saved revision. Published course details and lessons are mutation-locked so learners do not receive an in-place partial revision. Unpublishing makes the course a private editable draft without deleting its lessons, enrollment, or payment history. Do not accept a typed lifecycle status, silently coerce an invalid paid price to zero, or expose submit, approve, or reject actions unless a real moderated-review backend workflow and role policy are implemented end to end.

Generic Personal/Facility course cleanup is also an owner-scoped soft archive. Only an unpublished private draft may be archived; a published course must first use the explicit unpublish lifecycle. Archive removes the draft from active and public course queries while retaining the course, lesson, enrollment, payment, and audit record. The interface requires a separate confirmation, explains that reusable Video Library files are not deleted, and returns the owner to the active course list in the same workspace. Only a successful archive clears the embedded course selection and refreshes the catalog; a stale route parameter must not reopen or refetch the archived course. A failed archive keeps the current detail and shows its error. Routine cleanup never hard-deletes a course.

Draft courses, lessons, media metadata, summaries, documents, and authoring fields are owner-only records. Public catalogs and direct course-detail routes may return them only after publication; an authenticated author or platform administrator may preview the author's own draft. That learner preview must render learner-facing course and lesson content, provider playback/fallback, and accessibility status without exposing authoring controls. Anonymous and unrelated authenticated requests must receive the same not-found response so a guessed or shared draft ID cannot disclose unpublished content.

The signed-out course catalog is discovery-only. It may request published public catalogs and show sign-in or registration actions, but it must not request an owned-course collection or expose Course Builder, create, invite, analytics, publish, unpublish, enrollment, purchase, or learner-progress controls before authentication.

The shared catalog and course detail must distinguish unresolved authentication or entitlements from a settled access denial. While access is resolving, show the existing loading presentation and do not start course requests or expose earlier course state. An initial access-check failure is a separate recoverable error, not a capability denial or an endless spinner. After readiness settles, apply the existing public, owner and Facility permissions without granting access. Discard superseded responses when readiness or session scope changes.

The same discovery boundary applies to the embedded course detail, not just its catalog. Before authentication settles, do not start personal learner requests. Signed-out details retain public descriptions, reviews, lesson titles and intentionally public free previews, but not personal payment/progress, notes, reports, AI, task or RSVP controls. Paid lessons and resources remain locked until current access is verified. A named sign-in action carries only the exact saved course identity through a validated same-origin course return. Login alone never enrolls, purchases or replays a learner action.

Course signup returns use the shared Commercial shopping-navigation contract, not a separate course continuation engine. Preserve the default Free-account legacy fallback: one strict product-or-course browser slot, email bound and revision safe for up to one hour, consumed only after deliberate matching ready sign-in. The account-owned extension carries only the same strict path and bounded plan/mode/expiry/revision metadata through token-only email verification, allowing another device to recover it after matching authenticated login. Confirmed server storage must not create a second consumable local copy. Keep explicit claim/return precedence, exact revision consumption, account/session fences, and normal guild onboarding; paid choices retain the walkthrough and checkout action with a separate explicit Return to course control. Never store course content, access, enrollment or payment instructions in continuation state. The destination loads normally and independently checks publication and current access; returning never enrolls, purchases or unlocks paid lessons. Free refers to the account plan, not the course price. Course gifting and return-after-payment remain separate workflows; local implementation alone is not hosted mail/cross-device acceptance.

Course-detail state is scoped to the current authenticated session, course and Facility workspace. Clear and revalidate it on sign-out, account/session, course or Facility changes, discard superseded requests, and do not reuse catalog ownership/access hints as a fallback after a failed detail load. Preserve existing authenticated owner and Facility permissions; a sign-in return does not grant paid content or workspace access.

A signed-in learner may report a course. Persist the report and moderation case before
attempting administrator-email delivery, and include both the exact course link and a
focused moderation-review link. Email delivery is not the moderation record and its
failure must not remove or reject an otherwise valid stored report.

## Paid access and payment support

Shared and public Storefront course details use a presentation-only price label.
Keep valid saved cents (preferred) or the legacy dollar amount. If existing paid
classification, a paid access/pricing marker or a saved provider-price identifier
indicates a paid course without a readable positive amount, say `Paid — price
unavailable`, never `Free`. Invalid non-paid amounts remain `Price unavailable`;
ordinary zero/absent-amount free courses retain `Free`. This does not invent a
price, repair stored data, prove source/mirror price agreement, change access or
checkout decisions, enable gifting, or establish payment-provider readiness.

A paid course catalog may expose discovery fields such as title, description, cover, price, and lesson titles. It must not expose lesson text, video or audio URLs, provider metadata, documents, images, assessment questions or answers, protected playback URLs, or completion controls before access is confirmed. An author or platform administrator may preview the author's course. A learner receives protected content only while an active enrollment exists.

Creating a Stripe checkout session records a pending purchase; it does not enroll the learner. Paid-course authors save a positive course amount and connect a provider-verified seller account; they never type Stripe Product or Price IDs. Checkout creates its immutable one-time line item from that saved amount and verified seller destination. Only a signature-verified paid Stripe webhook may activate paid enrollment, add the learner to course counts, and record creator earnings. Webhook retries must be idempotent and must not increment enrollment, revenue, or earnings more than once. Direct enrollment and lesson-completion endpoints must never manufacture paid access.

A learner may request GrowPath refund review or report a payment issue only after a paid purchase exists. A GrowPath payment-issue report is support intake; it is not a bank, card-network, or Stripe dispute and the interface must say so. Do not show refund or payment-issue forms to an unpaid learner or course owner.

Stripe refund and dispute webhooks remain the source of truth for external payment state. A full refund revokes enrollment, removes the learner from course counts, adjusts revenue, and removes the refunded creator earning from payout eligibility. An open or unresolved Stripe dispute revokes access and holds the earning. A won dispute may restore access and release the hold. Replayed checkout webhooks must not erase a refund, dispute, or hold state.

Buyer-facing payment status shows enrollment, payment, refund, and GrowPath support state. It must not expose creator settlement internals. Creator payout queries include only available, unpaid earnings; held and refunded earnings are not payout eligible.

Creator earnings pages may show a GrowPath-recorded seller-net ledger and separately identify held or adjustment-pending amounts, but they must not call either value a Stripe balance or a completed bank payout. Stripe Connect onboarding and readiness are provider-verified whenever the payout surface loads. The connected Stripe dashboard remains the source of truth for balances and bank-payout timing. GrowPath does not expose a local request-payout or mark-paid action; an older local paid marker is read-only, explicitly unverified, and never treated as provider payout proof.

## Playback and fallback

Use first-party playback for GrowPath uploads. Protected library videos retain only their stable asset path and video ID in the lesson; the learner obtains a short-lived playback URL only after the API verifies course and workspace access. Never save an object-store credential or expiring signed playback URL in the course. Use a normalized YouTube or Vimeo player only when the author recorded the source as available and explicitly allowed embedding. Preserve Vimeo unlisted privacy hashes in both canonical and player URLs. Keep Rumble and unknown providers link-only until a stable reviewed provider contract exists.

Before loading a third-party player, explain that the learner will connect to the provider and that provider cookies or viewing collection may apply. Require an explicit click to load. Always keep the provider link, text summary, captions/transcript status, lesson text, documents, audio, images, tasks, notes, and discussion usable when playback is unavailable.

Playback state and provider consent belong to the current lesson/media, authenticated session and workspace. Changing that scope must remove the prior player immediately, require fresh third-party consent, and discard superseded protected-playback responses. A failed or empty protected-playback read offers an explicit Retry while retaining the written summary; recovery neither enrolls nor completes a lesson.

GrowPath lesson progress changes only through the explicit lesson-completion action. Do not infer provider watch time, completion, or engagement from opening a link or loading an embed, and do not merge provider analytics into GrowPath progress unless a separately verified provider integration defines that contract.

Document and audio opening must also remain bound to the requesting course and
authenticated workspace/session. After resolving a protected resource URL, verify
that the requesting detail is still mounted before opening it; leaving the detail
or replacing its course/account/workspace discards late successes and errors.
Denied access never falls back to opening the raw protected URL. An explicit
retry rechecks access without enrollment, completion, note writes or payment.

## Evidence policy

Facility course and lesson documents use the existing course editor with a separate private upload
and scan check, available only when the server's current Facility-author capability
check succeeds. A receipt or pending scan is not an attachment: only the server's
persisted active proof can select the protected file for the explicit lesson save.
Keep the same upload-attempt key after a lost response and check its existing
reservation without automatically resending bytes. Session, Facility, lesson or
permission changes discard late client results. Existing documents and other media
stay intact; choosing a replacement does not delete an older file or publish a
course. Local UI acceptance does not claim hosted scanner readiness.
The picker intersects current server capabilities with reviewed PDF/TXT/CSV/DOCX/XLSX
types and the 10 MB limit. Explain restricted Office support before selection:
macros, external links, embedded objects and unsupported formulas are rejected,
including otherwise valid files outside this subset. Never rewrite a file or imply
legacy DOC/XLS support. Only an explicit pre-reservation server rejection allows a
fresh choice; uncertain upload replies retain the existing recovery key.
An exact HTTP 429 `DOCUMENT_UPLOAD_BUSY` is a pre-reservation refusal, not a
pending scan. Explain that the file was not accepted, ask the author to wait
15 seconds, and permit a deliberate new choice without automatically resending
bytes. Generic rate limits, conflicts, lost replies and a later missing-status
response do not establish that guarantee and must retain the recovery key.
The course builder adds verified files to its existing document collection without
resending bytes on Save. A second file choice is available only after the previous
file is verified; pending or ambiguous attempts keep their tracking key. Course
and lesson authoring remount on account, Facility, role or lesson scope changes.
Lesson PDF replacements use the existing PDF field; other verified documents append
once to the existing document URL collection, preserving the saved PDF and previous
resources. Course documents retain their canonical file type. No selection publishes
a course or grants access through a copied link; the existing protected reader checks
current course visibility, workspace access and paid enrollment independently.
After leaving or reloading an editor, an explicit recovery action reads at most ten
recent unreleased supported document records for the original uploader in the current Facility.
Do not persist credentials or file data in browser storage for recovery. Listing
metadata does not attach, promote or download anything; selecting a record rechecks
its current authority/status and retains its verified filename/MIME metadata. Older
PDF-only recovery responses may omit MIME; never infer Office support from a filename
alone. Pending records still need the explicit scan check,
and only durable active proof can select an attachment for Save. Other authors'
uploads, other workspaces and released files are not a recovery catalog. Older
records beyond this bounded list remain an Admin metadata-review case.

Private document recovery is an owner-only metadata workflow using existing fresh
Admin passkey proof and audited server checks. A retention decision is not removal
permission: revoked-copy removal requires its own exact confirmation and server
hold/reference checks. Preserve exact request/execution IDs after an ambiguous
response; refresh must not silently create a new deletion. Never open private
content or infer old-writer termination from a currently idle runtime.

An already-proved interrupted revoked-cleanup claim may be reassigned only through
the separately confirmed, server-authorized handoff to another configured owner.
Use opaque claim references from the protected recovery report, not manually guessed
IDs or previous actor identities. Reassignment does not remove bytes, return quota,
grant a role or authorize removal. Keep the new review/execution IDs for the separate
removal confirmation. Uncertain responses retain the same request in page memory,
including across same-account passkey renewal; expired proof hides metadata and
disables actions, while identity changes clear it and discard late responses. Never
persist credentials or private content for retry. A page reload loses this local
continuation and must return to server metadata review, not invent a replacement
request. Browser/hosted acceptance remains distinct from local component tests.

- `youtube-player-documentation` is Tier B provider documentation for YouTube player behavior and data-sharing constraints. It is not proof that an individual video is available, embeddable, licensed, captioned, or suitable.
- `vimeo-video-privacy-documentation` is Tier B provider documentation for Vimeo privacy, domain, and unlisted-hash behavior. It is not proof of an individual video's current settings or rights.
- Author rights confirmation and the timestamped availability check are owner evidence. They do not override provider terms or legal requirements.
