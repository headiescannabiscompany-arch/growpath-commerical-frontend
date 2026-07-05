# Web Launch Runbook - 2026-07-05

## Current Step

The web launch is already live. The domain has been purchased and configured,
and current production URL checks are passing.

We are prioritizing live web QA and launch hardening while pausing iOS/App Store
work until Apple Developer and App Store Connect accounts exist.

Resume from here if interrupted:

1. Run `git status --short`.
2. Run `npm.cmd run verify:live-urls` with `NODE_OPTIONS=--use-system-ca`.
3. Confirm `https://growpathai.com` and `https://api.growpathai.com` are healthy.
4. Confirm whether Render is serving the latest pushed bundle.
5. Continue at **Human Account / Billing Checks** below.

## Current Web State

- Public web app domain: `https://growpathai.com`
- API domain: `https://api.growpathai.com`
- Static hosting target in repo: Render static site via `render.yaml`
- Build command: `npm run build`
- Build output: `dist`
- Production API env var: `EXPO_PUBLIC_API_URL=https://api.growpathai.com`
- SPA fallback route: `/*` rewrites to `/index.html`

## Verification Completed

Latest live URL verification:

- Date: 2026-07-05
- Command: `npm.cmd run verify:live-urls`
- Result: passed
- Evidence:
  - `tmp/spec/live-url-checks/2026-07-05T15-32-58-936Z.json`
  - `tmp/spec/live-url-checks/2026-07-05T16-19-47-231Z.json`
  - `tmp/spec/live-url-checks/2026-07-05T16-55-35-642Z.json`
  - `tmp/spec/live-url-checks/2026-07-05T16-56-56-228Z.json`

Checked URLs:

- `https://growpathai.com/privacy` returned 200
- `https://growpathai.com/terms` returned 200
- `https://growpathai.com/support` returned 200
- `https://growpathai.com/account/delete` returned 200
- `https://api.growpathai.com/health` returned 200
- `https://api.growpathai.com/ready` returned 200
- `https://api.growpathai.com/api/health` returned 200

Latest pushed web fix:

- Commit: `473ade6`
- Commit message: `Harden live web auth profile QA`
- GitHub Frontend CI: passed
- GitHub Production Build Preflight:
  - Release preflight: passed
  - Android EAS production build start: passed
  - iOS EAS production build start: failed because Apple/iOS credentials are not
    configured yet
- Local `npm.cmd run release:preflight`: passed
- New exported bundle in repo: `index-14fffa668d8759f16dff5a560dc64d7b.js`
- Live site was still serving `index-ed86e3aa831d4d4ed07281f92e51ecaf.js`
  when checked after push.
- Render/Cloudflare response showed `Last-Modified: Sun, 05 Jul 2026 14:15:56 UTC`.
- Render deploy was unblocked after pipeline minutes were upgraded.
- Production is now serving a newer Render build:
  - Live bundle: `index-0ba9643d9737ce92a5259694a38f1193.js`
  - `Last-Modified: Sun, 05 Jul 2026 16:55:04 UTC`

Latest live account verification:

- Date: 2026-07-05
- `free@growpathai.com` authenticated and routed into the personal shell.
- Focused free-mode Playwright check passed against production using system
  Chrome:
  - login
  - personal home
  - free-plan Grows gating
  - feed content visibility
  - Profile/privacy controls
  - logout returning to `/login`
- Focused free-mode Playwright check passed again after Render went live.
- Commercial, facility, and pro emails currently return invalid credentials
  through both browser login and direct API login checks.
- Rechecked after web deploy:
  - `free@growpathai.com`: authenticates
  - `livingsoillabs@growpathai.com`: all provided passwords failed
  - `Johnc@growpathai.com`: all provided passwords failed
  - `headiescannabiscompany@gmail.com`: all provided passwords failed
- Current blocker for full user-mode QA: create or reset working commercial,
  facility, and pro production test accounts.

Live issue found:

- Production `/api/auth/login` returns the correct free account email, but
  production `/api/me` currently returns `email: null`.
- Before the frontend auth-hydration fix is deployed, the Profile email field can
  show the placeholder `email@example.com` after login.
- Frontend fix: preserve known login identity fields when `/api/me` sends null
  identity fields.
- Backend follow-up: fix `/api/me` so it returns the full authenticated user
  identity on reload, not only id/plan/mode context.

## Hosting Cost Snapshot

Pricing must be confirmed inside the billing account before purchase, but the
current public hosting pages show:

- Render Static Sites: `$0 USD per month` for static sites, with CDN,
  continuous Git deploys, cache invalidation, custom domains, and managed TLS.
- Render Hobby workspace: `$0/mo + compute`, includes 5 GB bandwidth and 2
  custom domains.
- Render Pro workspace: `$25/mo + compute`, includes more bandwidth, support,
  previews, and team/production features.
- Render bandwidth over included limits is listed at `$0.15/GB`.

Because the frontend is a static Expo web export and the backend already points
to Render, the lowest-friction path is to keep the frontend on Render unless
live traffic, support, team access, or uptime needs justify upgrading.

## Render Pipeline Minutes Note

Current deploy blocker:

- Render showed `Your workspace has run out of pipeline minutes`.
- Deploys failed before build logs appeared because the build was blocked before
  it started.
- The user is considering an upgrade with roughly twice as many pipeline/build
  minutes.

Important distinction:

- Render pipeline minutes are spent by builds/deploys, not by normal public web
  traffic.
- `growpathai.com` running on the web does not consume pipeline minutes by
  itself.
- Apple/iOS and Android EAS builds do not consume Render pipeline minutes; those
  are handled by Expo/EAS and Apple/Google store accounts.
- Apple Developer Program enrollment and App Store setup are separate costs and
  blockers from Render.

Recommendation:

- Upgrade Render enough to unblock web deploys now.
- After deployment is stable, avoid burning minutes on unnecessary redeploys.
- Consider disabling auto-deploy for doc-only commits or batching small changes
  before deploys.
- Budget separately for Apple Developer enrollment and any Expo/EAS native build
  capacity.

## Human Account / Billing Checks

These require the site owner because they involve billing, domain ownership, or
external credentials.

1. Log in to Render.
2. Confirm whether `growpath-commercial-frontend` already exists as a Static
   Site.
3. If it exists, confirm it is connected to the intended GitHub repo and branch.
4. If it does not exist, create it from the GitHub repo:
   `headiescannabiscompany-arch/growpath-commerical-frontend`.
5. Use the repo blueprint or set:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Environment variable: `NODE_VERSION=20.19.4`
   - Environment variable: `EXPO_PUBLIC_API_URL=https://api.growpathai.com`
   - Optional secret: `EXPO_PUBLIC_SENTRY_DSN`
6. Confirm custom domains are attached:
   - `growpathai.com`
   - `www.growpathai.com`
7. Confirm DNS at the domain registrar matches the exact records Render
   provides.
8. Confirm the billing/payment method and upgrade only if Render requires it for
   the chosen workspace/service level.
9. After any DNS, billing, or hosting change, rerun `npm.cmd run verify:live-urls`.

## Codex Actions Available Before More Human Input

- Keep verifying live public/API URLs.
- Run release preflight after any source change.
- Prepare a Render deploy hook workflow if the user creates a Render deploy
  hook and adds it as a GitHub secret.
- Update support, privacy, terms, or launch documentation.
- Continue live free-mode UI testing with the working free account.
- Continue live pro/commercial/facility UI testing after those credentials are
  created or reset.

## Paused Native/App Store Track

iOS is intentionally paused because an Apple Developer account and App Store
Connect setup do not exist yet.

Known native status:

- Expo/EAS authentication works with the configured token.
- Android EAS production build start previously reached the build-start stage.
- iOS build start requires interactive Apple credential setup.
- App Store submission cannot proceed until Apple Developer enrollment and App
  Store Connect app records are created.

## Quality Gate Before Calling Web Ready

Before accepting the web app as live-ready:

1. Confirm Render deploy is connected to the intended GitHub branch.
2. Confirm custom domain and TLS are active.
3. Run `npm.cmd run verify:live-urls`.
4. Run `npm.cmd run release:preflight` after any frontend change.
5. Log in as each live user type and test:
   - free personal
   - pro personal
   - commercial
   - facility
6. Check logout, ads, forum image upload, commercial image upload, profile
   links, and core navigation.
7. Capture screenshots for desktop and mobile.
8. Record any live defects in `docs/release-deep-dive-qa-2026-07-05.md` or a
   new dated QA document.
