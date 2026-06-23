# Grow Data Integrations

## Supported provider registry

The integration catalog currently includes:

1. Pulse Grow
2. TrolMaster
3. Growlink
4. SensorPush
5. Aranet Cloud
6. UbiBot
7. METER Group / ZENTRA Cloud
8. HOBOlink / LI-COR Cloud
9. Monnit / iMonnit
10. OpenSprinkler
11. Agrowtek

Provider availability is reported by the backend. The UI must display that status and
must not describe a provider as connected until its adapter test succeeds.

## Provider states

- `implemented`: an adapter exists and can test credentials and fetch data.
- `access_required`: GrowPath can store credentials, but the vendor must approve API access.
- `contract_pending`: the integration shell exists; the final vendor API contract is still needed.
- `gateway_required`: the provider uses a local protocol or gateway instead of a cloud API key.

Pulse Grow is the first implemented cloud adapter. Other providers can be configured as
draft connections without exposing their credentials, but return `ADAPTER_NOT_AVAILABLE`
until their adapters are implemented.

## Provider notes

### Growlink

Growlink confirmed by email on 2026-06-22 that customers can request API access
and use the developer portal after creating a Growlink account. There is no
sandbox; validation requires either a Growlink R&D system or a beta customer
with API access enabled.

Reference links supplied by Growlink:

- Developer portal: `https://developer.growlink.com`
- API signup: `https://developer.growlink.com/signup`
- API catalog: `https://developer.growlink.com/apis`

Read-only ingestion scope:

- Auth token: `POST https://api.developer.growlink.com/V1/api/auth/token`
- Controller/module/sensor/device discovery:
  `GET https://api.developer.growlink.com/hardware/v1/api/controllers`
- Current readings:
  `GET https://api.developer.growlink.com/v1/v1/api/equipment/interaction/data/device/{controllerId}`
- Historical reporting: Growlink Reporting API, with reported 10 minute delay.

Do not use Rules, Setpoints, or equipment-control endpoints for GrowPath's first
integration. GrowPath should import Growlink data for dashboards, grow logs,
alerts, crop steering, and reports only; it must not modify Growlink hardware,
rules, recipes, devices, or setpoints.

Current status: viable / read-only shell added / account-auth can be validated
without hardware. `src/integrations/growlink.ts` records dependency-free contract
helpers for auth request construction, controller/current-reading URLs,
read-only authorization/unit headers, controller normalization, and
current-reading normalization. `src/api/telemetry.ts` defines frontend API calls
for credential verification, controller listing, current-reading pull, and
historical reporting pull. The app's Data Integrations screen lets a user verify
their Growlink account and reports the no-hardware state clearly when no
controllers are returned. A telemetry source still requires a controller id.
The backend has read-only telemetry endpoints for credential verification,
controller listing, encrypted source storage, and current-reading fetch.
Historical reporting ingestion intentionally returns an explicit not-implemented
error until Growlink report query mapping is finalized. Keep Growlink out of
`implemented` status until a real customer/R&D controller is available and
controller mapping, current/historical pull jobs, rate limits, unit
normalization, and real hardware tests pass.

### UbiBot

UbiBot confirmed by email on 2026-06-22 that third-party integrations are
available through Developer Membership and that the public platform supports API
and MQTT functions.

Reference links supplied by UbiBot:

- Developer Membership: `https://www.ubibot.com/ubibot-developer-membership/`
- Channel feed summaries API:
  `https://www.ubibot.com/platform-api/2735/get-channel-feed-summaries/`
- MQTT real-time feed topics:
  `https://www.ubibot.com/platform-api/6966/mqtt-real-time-feed-topics/`

Current status: parked. API/MQTT access paths are confirmed, but GrowPath should
not spend more implementation time until a paid/approved Developer Membership,
test credentials, and at least one real UbiBot channel/device are available.
`src/integrations/ubibot.ts` records dependency-free contract helpers for
feed-summary URLs, MQTT settings, heartbeat URLs, and feed-summary normalization.
`src/api/telemetry.ts` defines the future frontend API calls for credential
verification, channel listing, feed-summary pull, and MQTT settings. Keep UbiBot
out of `implemented` status until backend endpoints, credentials, channel/device
discovery, live feed summary retrieval, MQTT topic handling, rate limits,
timestamp/unit normalization, and real-device tests pass.

## Backend API

- `GET /api/integrations/providers`
- `GET /api/integrations/connections`
- `POST /api/integrations/connections`
- `PATCH /api/integrations/connections/:id`
- `DELETE /api/integrations/connections/:id`
- `POST /api/integrations/connections/:id/test`
- `GET /api/integrations/connections/:id/devices`
- `POST /api/integrations/access-requests`

Connection credentials are encrypted before they are stored and are never returned by
the API. Set `TELEMETRY_SECRET_KEY` to a high-entropy production secret. `JWT_SECRET` is
accepted as the existing application fallback, but production should use a separate key.

## Adapter contract

Each provider adapter belongs under `services/integrations/adapters` in the backend and
is registered in `services/integrations/index.js`. An adapter should expose the operations
supported by its provider, beginning with:

```js
{
  testConnection({ credentials, config }),
  listDevices({ credentials, config }),
}
```

Telemetry adapters should normalize vendor readings before persistence. Preserve the raw
vendor response only where it is required for diagnosis or future field mapping.

## Private API access

`POST /api/integrations/access-requests` creates a provider-specific request subject,
message, and vendor request URL. The Data Integrations screen lets the user review that
request and open the vendor contact page.

This endpoint does not send email. Automatic delivery requires a configured transactional
email service and an approved destination address for each vendor. Until then, requests
remain user-reviewed drafts so GrowPath does not silently send incomplete or duplicate
vendor applications.

## Adding a provider adapter

1. Obtain the official API contract and credentials from the vendor.
2. Add the adapter without changing the generic connection model.
3. Register it in the adapter registry.
4. Change the provider status to `implemented` only after credential and device tests pass.
5. Add contract tests for authentication failure, pagination, rate limiting, malformed data,
   and secret redaction.
6. Map the normalized readings into GrowPath telemetry and source-selection workflows.
