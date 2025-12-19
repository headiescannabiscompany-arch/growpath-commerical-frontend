## Acceptance Testing Guide

This guide outlines how to exercise the mobile + web clients against a real backend, mirroring the backend repo’s `tests/acceptance/*.test.js` philosophy.

### 1. Configure `.env.test`

Store all acceptance-specific env vars in `.env.test` (already checked in):

```
EXPO_PUBLIC_API_URL=http://127.0.0.1:5001
#BACKEND_DIR=backend
BACKEND_DIR=../growpath-backend
#BACKEND_START_COMMAND=npm run dev
#ACCEPTANCE_COMMANDS=expo start --web
```

- `EXPO_PUBLIC_API_URL` – the host/port your client hits during acceptance runs (default `http://127.0.0.1:5001` to match `npm run dev` in the backend repo).
- `BACKEND_DIR` – path to the backend project. Defaults to the sibling repo; uncomment the `backend/` line if you embed one inside this repo.
- `BACKEND_START_COMMAND` – override the command that boots the backend (defaults to `npm run dev`).
- `ACCEPTANCE_COMMANDS` – optional override for the client-side runner (`expo start --dev-client`, `expo start --web`, etc.).

Load this file (`source .env.test` or `env $(grep -v '^#' .env.test | xargs) <command>`) whenever you start Expo, Detox, or Playwright so the API URL is embedded in the bundle.

### 2. Start the Backend

Use the helper script, which respects the `.env.test` settings:

```
npm run backend:start
```

The script:

1. Loads `.env.test` (or `ENV_FILE=...`).
2. Finds the first backend directory that exists (`$BACKEND_DIR`, `../growpath-backend`, then `./backend`).
3. Executes `BACKEND_START_COMMAND` (default `npm run dev`) inside that directory.

Leave this process running while you run acceptance automation.

### 3. Launch the Client / Runner

In a second terminal (with `.env.test` loaded), run:

```
npm run acceptance
```

This runs `scripts/run-acceptance.js`, which executes `ACCEPTANCE_COMMANDS` (defaults to `npm test -- "tests/acceptance/*.test.js"` so you can exercise the shared client libraries without launching Expo). Override `ACCEPTANCE_COMMANDS` in `.env.test` when you need a different runner, e.g.:

- `ACCEPTANCE_COMMANDS="expo start --dev-client"` to boot the development client.
- `ACCEPTANCE_COMMANDS="expo start --web"` for browser flows.
- `ACCEPTANCE_COMMANDS="detox test e2e/*.spec.ts"` for Detox.
- `ACCEPTANCE_COMMANDS="playwright test"` for Playwright.

You can still run these commands manually—`npm run acceptance` just keeps the configuration centralized.

### 4. Drive Your Acceptance Scenarios

With the backend running and the client started via `npm run acceptance`, execute your acceptance suite of choice:

- **Detox (React Native):** connect the device/emulator and run the Detox scripts (they’ll hit the backend at `EXPO_PUBLIC_API_URL`).
- **Playwright/Cypress (Expo web):** point tests at the Expo web server.
- **Manual exploratory testing:** simply use the running app; all requests already target the configured backend.

Keep acceptance stories aligned with the backend repo’s coverage (auth, cultivation, monetization, social, etc.) so both sides stay in sync. Document new scenarios in both repos when you add them.
