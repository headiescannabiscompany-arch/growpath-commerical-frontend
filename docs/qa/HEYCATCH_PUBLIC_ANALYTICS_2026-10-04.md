# HeyCatch public marketing analytics

Owner request: follow https://heycatch.ai/agents.md with project key
`hck_pk_Vu7gSIhkxVCmtc6M8S_lkn4S_EQjzMOE`. The owner subsequently selected
**public marketing pages only** and asked to retain useful analytics while
protecting users. This narrower scope controls over the full-app examples.

## Installation contract

- Official npm `latest` resolved to stable `@heycatch/sdk` **0.8.0**, not a
  prerelease, on October 4, 2026. Regular dependency, exact lockfile version.
- Static import; initialization called at module scope in the universal client
  entry, before `renderRootComponent`. SDK handles SSR and repeat initialization.
- Web implementation only. Native entry is a no-op, so Expo native companions and
  `HeyCatchProvider` are intentionally not added. The SDK's browser export does
  not export that native provider. No new native-app tracking is authorized.
- Publishable key is inlined; no `apiHost`, secret, or environment-key plumbing.
- No manual pageview/click handlers, router listeners, identity calls, user
  properties, signup events, billing events, cross-origin tracing or API changes.
- `requestBatching:false` covers full-document public navigation as well as SPA
  navigation. SDK autocapture owns page and click events.
- Exact public path allowlist in `src/analytics/marketingPolicy.ts`. Both actual
  current location and event location must be approved production marketing URLs.
  Staging, local, contact forms, auth, stores, public user media, all account and
  workspace routes, journals, feedback, Admin and Vault events are dropped.
- Filter rebuilds event properties from a small allowlist before queuing. It
  removes raw element chains/attributes, input contents, arbitrary rendered text,
  identity updates, referrer/initial-page histories, query strings and fragments.
  Only reviewed static navigation labels survive as click labels. Anonymous SDK
  session/device identifiers and basic browser/viewport metadata remain useful.
- Session-storage identity, not account identification. Do Not Track is honored.
  No person profile or cross-device account attribution is enabled. The SDK disables
  session recording in its browser build; no replay feature is added by this work.
- Only documented `heycatch` source plus a single lowercase letter/digit campaign
  code is retained. Other arbitrary UTM values are not sent in this bounded setup.
- Current production HTTP response has no enforced or report-only CSP. Do not add
  a broad CSP or weaken an existing one. If a CSP is introduced, HeyCatch requires
  `https://in.heycatch.ai` in effective script-src and connect-src directives.
- Keep existing SPA catch-all for reserved `/a`–`/z`, `/0`–`/9` URLs so the SDK's
  built-in short-link forwarding runs; verify `/x` returns the app, then actual
  browser forwarding. Do not invent an unsupported Render regex/status field or
  replace real app routes with a broad parameter redirect.
- SDK declares Node >=22. Build configuration and CI are updated to locally
  verified Node24.18.0. Production Dashboard has no NODE_VERSION override or linked
  environment group; the versioned `.node-version` selects it without an environment
  edit. No credential or other hosted setting needs changing.

## Release boundary

Isolated branch `feature/heycatch-public-20261004`, checkout
`work/growpath-heycatch-public-20261004`, based on confirmed production
`12055bff6b893ce9179b22e18cae7adebb62580c`. It does not include W05 feedback changes.
No backend, Stripe, indexes, webhook markers, credentials or real records changed.

Local checks: 41 analytics policy/entry tests and 13 public marketing/metadata
regressions pass; TypeScript, touched-source ESLint and production export pass.
The exported bundle includes the stable browser SDK and key, not the native provider.
An initial entry-test mock referenced its function before Jest hoisting completed;
the corrected forwarding mock passes without changing application assertions.
Existing public `/x` returns200 and the SPA bundle. No new routing/CSP rule is needed
for the guide's SDK fallback, though an exact host302 rule could later replace it.

Pending: exact-commit release and ordinary-browser verification.
Do not claim installation live or dashboard receipt from a build or an automated
browser. After release the owner should browse public pages briefly, then choose
**I've installed** on HeyCatch's Install page. Bot traffic is filtered by HeyCatch;
never spoof webdriver/user-agent signals or fabricate analytics events.
