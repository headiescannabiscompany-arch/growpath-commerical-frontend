# Store Privacy And Data Safety Answers - 2026-07-01

Status: source-derived answer set ready for release-owner/legal entry into App
Store Connect and Google Play Console. Final console submission still requires
legal approval and release-owner sign-off.

## Source Evidence

- `app.json`: camera, photo library, and photo-save permission strings.
- `src/auth/tokenStore.ts`: native auth token stored with SecureStore; web token
  stored with AsyncStorage.
- `src/api/users.js`: profile update, privacy data export, and account deletion
  endpoints.
- `src/api/uploads.js`: image and course-media upload endpoints.
- `src/api/diagnose.js`: diagnosis text/photo submission and diagnosis history.
- `src/utils/monitoring.ts`: Sentry crash reporting is disabled unless
  `EXPO_PUBLIC_SENTRY_DSN` is configured; traces sample rate is `0`.
- `APP_STORE_LISTING.md`: educational/documentation positioning and privacy URL.

## Data Collected Or Processed

| Data type | Examples in this app | Required | Linked to user | Purpose |
| --- | --- | --- | --- | --- |
| Account identifiers | Name, email, profile settings, account mode, plan state, facility context | Yes for account use | Yes | Account creation, login, authorization, support, subscription/status display |
| User content | Grow names, plant records, grow logs, tasks, notes, comments, course/forum/community content, commercial/facility records | Optional by feature | Yes | App functionality, record keeping, collaboration, education workflows |
| Photos and uploaded files | Grow photos, diagnosis photos, plant photos, storefront/product/course media, creator signature, feeding labels | Optional by feature | Yes | App functionality, documentation, AI-assisted plant insight, marketplace/course workflows |
| Diagnostics and environment context | Symptoms, plant stage, pH/EC, temperature, humidity, light, nutrients, grow context, diagnosis feedback | Optional by feature | Yes | AI-assisted plant insight, history, follow-up tasks, product improvement/support review |
| Telemetry/integration data | Optional grow-environment sensor readings and provider configuration entered by the user | Optional by feature | Yes | App functionality, charts, alerts, grow analysis |
| Commercial/facility operational data | Storefront, products, inventory, orders, links, campaigns, rooms, batches, SOPs, equipment, audit logs, reports, team roles | Optional by mode/plan | Yes | App functionality, operations, compliance-style record keeping |
| Crash diagnostics | Exception type, stack/context extras such as screen or boundary labels, app environment | Only when production Sentry DSN is configured | Potentially linked by app/account context if Sentry is configured that way | Crash reporting, reliability, support |
| Device permissions | Camera and photo library access | Optional permission prompt | No standalone profile by this app | User-selected photo capture/upload and optional local photo saving |

## Data Not Collected By Current Frontend Configuration

- Precise location or background location.
- Contacts, calendars, health, fitness, or financial account data.
- Advertising ID or third-party advertising tracking.
- Audio recording or microphone input.
- Continuous background sensor collection.
- Sentry performance traces, because `tracesSampleRate` is `0`.

## Apple App Privacy Draft

Use these as the store-console answers unless legal changes the privacy policy
or release scope before submission.

- Data used to track users across apps and websites: No.
- Data linked to the user:
  - Contact Info: email/name/profile fields for account and support.
  - User Content: photos, notes, grow logs, posts, uploaded course/storefront
    media, commercial/facility records.
  - Identifiers: user ID/account ID/authenticated API identity.
  - Diagnostics: crash data when Sentry is configured.
  - Other Data: grow/environment records, diagnosis context, optional telemetry
    provider readings, facility role/context.
- Data not linked to the user:
  - Device permission state may be processed locally for camera/photo-library
    access, but it is not a standalone collected profile in this frontend.
- Purposes:
  - App Functionality: all account, content, grow, diagnosis, telemetry,
    commercial, and facility workflows.
  - Analytics/Product Improvement: diagnosis feedback and operational records
    may be reviewed in aggregate only if backend policy allows it.
  - Developer Communications/Support: account, export/delete, support, and
    crash triage.
  - Other: legal/compliance record keeping for user-entered facility records.
- Sensitive Info:
  - Do not claim automatic collection of regulated identity, health, financial,
    or precise-location data from this frontend.
  - Cannabis-related grow records are user-entered content and should be
    disclosed in privacy policy/support copy as sensitive by context, even if
    App Store Connect does not provide a cannabis-specific data category.

## Google Play Data Safety Draft

- Does the app collect or share user data: Collects user data. No sale of user
  data is implemented in this frontend.
- Is all user data encrypted in transit: Yes, production API and legal/support
  URLs are HTTPS in `eas.json`; final release-machine URL checks must pass.
- Can users request deletion: Yes. In-app profile controls call the backend
  account deletion endpoint, and the public delete-account URL is configured as
  `https://growpathai.com/account/delete`.
- Data types:
  - Personal info: name, email, account/profile preferences.
  - Photos and videos: user-selected photos/media for grow records, diagnosis,
    course, community, commercial, and facility workflows.
  - Files and docs: optional uploaded course/media/labels/signatures where
    enabled.
  - App activity: grow logs, tasks, tool runs, diagnosis history, course/forum
    activity, facility/commercial records.
  - App info and performance: crash logs when production Sentry is configured.
  - Device or other IDs: authenticated account/user IDs and API identifiers.
- Purposes:
  - App functionality.
  - Account management.
  - Analytics/product improvement where covered by privacy policy.
  - Developer communications/support.
  - Security, fraud prevention, and compliance-style audit records.
- Optional data:
  - Photos/media uploads, diagnosis context, telemetry provider connections,
    commercial/facility workflows, and community/course contributions are
    feature-optional.
- Required data:
  - Account identifiers and authentication state are required for authenticated
    app use.

## Release Sign-Off Requirements

Before store submission, the release owner must:

1. Confirm the hosted privacy policy matches the data categories above.
2. Enter matching Apple privacy nutrition labels and Google Play data safety
   answers.
3. Confirm whether backend/Sentry configuration links crash events to user IDs.
4. Confirm backend retention periods for photos, diagnosis records, telemetry
   data, exports, deletion requests, and audit logs.
5. Attach legal approval for cannabis-context user content, AI diagnosis limits,
   image retention, and account deletion/export policy.
