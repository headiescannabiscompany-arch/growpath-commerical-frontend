# Grow Data Integrations

## Supported provider registry

The integration catalog currently includes:

1. Pulse Grow
2. TrolMaster
3. AROYA
4. Growlink
5. SensorPush
6. Aranet Cloud
7. UbiBot
8. METER Group / ZENTRA Cloud
9. HOBOlink / LI-COR Cloud
10. Monnit / iMonnit
11. OpenSprinkler
12. Agrowtek

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

