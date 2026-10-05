# Optional native HeyCatch screen analytics

Implementation receipt: October 4, 2026. This is **not a mobile release receipt**.

October 4 follow-up: register the fixed public project on the first consented
allowlisted screen, once per opt-in period. No event on the Privacy page or after
revocation. The actual transport's group() API requires person processing; instead
the adapter captures only the filtered public $groupidentify envelope while
keeping personProfiles=never. Caller group properties are never forwarded.
The screen-only scope includes this public registration, not personal identity.

The analytics-preview EAS profile produces an internal build using the explicit
production API/public URLs. It does not submit to a store or change production
version counters. .easignore excludes local dotenv files, signing files, build
outputs and evidence folders before upload; signing remains in existing EAS storage.

## Scope and provider deviation

The owner approved a privacy-safe native expansion and then a custom alternative.
The installed stable `@heycatch/sdk` 0.8.0 native entry ignores caller `beforeSend`;
its provider automatically captures route parameters and taps. Do not initialize
that entry or mount its provider. The website integration remains unchanged.

This implementation uses its pinned underlying `posthog-react-native` 4.78.4
transport directly, with HeyCatch's existing public ingestion token, project
metadata and `https://in.heycatch.ai` endpoint. It is a custom screen-only adapter,
not the complete official native SDK installation. Provider-side dashboard
classification/counting still needs real-device acceptance. Do not use synthetic
test traffic as proof of real users or bypass the provider's bot filtering.

## Privacy contract

- Off by default. No client is constructed before explicit opt-in, or a previously
  saved `yes` choice is loaded. Native Privacy Policy contains the optional switch.
- Memory-only SDK persistence; random analytics identifiers reset with app restart.
  No account `identify`, user ID, email, name, account group or person profile.
- Only exact reviewed public/browsing route names in `nativePolicy.ts` produce
  `$screen` events. Never use global route parameters, query strings or dynamic IDs.
- Private journals, photos, feedback, search values, messages, profiles, checkout,
  authentication, Admin and Vault routes/content are excluded.
- Lifecycle/deep-link, notification-open/token, tap, error, recording/replay,
  survey and feature-flag capture are disabled. An iOS configuration hard-stop
  also disables notification-open capture before JS initialization.
- Event envelopes are rebuilt from an allowlist, including only screen label,
  random analytics/session IDs, coarse OS/app/library versions and fixed project
  attribution. As with any HTTPS request, the receiving service handles the
  connection's network address; geo-IP enrichment is disabled.
- Revocation closes the application gate synchronously. Async opt-in completion
  cannot reopen it after revocation or unmount. Already transmitted events cannot
  be recalled; future events are blocked. Failed preference persistence stays off
  for that session and displays a retry message.
- The web component is a no-op and does not bundle the native transport/control.
  Web analytics remain public-marketing-only with the existing DNT protections.

## Verified locally

85 focused tests pass across native policy, consent controller, native UI,
installed native transport and existing web policy/entry/SDK contract. The actual
transport test intercepts every fetch and decompresses its outgoing batch: only
the approved screen reaches the batch, private sentinel fields and autocapture
are absent, and opt-out prevents subsequent screen transmission. No test events
are sent to HeyCatch.

Typecheck, touched-source ESLint, contamination guard and production web export
pass. The web bundle contains none of the native adapter/consent markers.
iOS and Android Hermes exports pass (after allowing Windows to start the local
compiler). These are JavaScript/bytecode bundles, not signed IPA/APK binaries.

## Remaining acceptance / release gate

1. Produce an authorized internal native build containing this revision; signing,
   store credentials and cloud-build charges are separate from this code change.
2. On a real device, open Privacy Policy. Verify initial off state, explicit
   enable, persistence after restart, disable, offline recovery and private-route
   exclusion. Inspect only synthetic test data in captured diagnostic traffic.
3. Confirm a consented normal-device public screen is attributed to this project
   in HeyCatch. A successful bundle/export is not ingestion/dashboard evidence.
4. Reconcile actual analytics collection with native store privacy disclosures
   before submitting/releasing the binary. Do not mark mobile analytics live until
   the native release and its acceptance are recorded.

Do not redeploy the backend, change Stripe markers, rerun completed feedback
acceptance, or publish a public completion claim for this native-only work.
