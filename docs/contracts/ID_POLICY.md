# GrowPath ID Policy

Status: canonical v1 contract

## Rule

GrowPath API IDs are opaque strings.

Do not require public API IDs to be UUID-v4 shaped. The app currently has a Mongo-backed persistence layer where stored records commonly have `_id` ObjectId values, while API and frontend surfaces normalize those values to `id` strings.

## Boundaries

- Persistence may use `_id`, ObjectId, or model-specific fields.
- Public API responses should expose `id` as the canonical field when serializing records.
- Legacy and compatibility responses may still include `_id`; clients must treat `_id` as a fallback, not as the preferred public field.
- Frontend route params, source links, task links, ToolRun links, and analytics IDs are strings.
- Frontend normalizers may accept `id`, `_id`, and domain-specific fallbacks such as `toolRunId`, `taskId`, `facilityId`, `roomId`, `logId`, or `uuid`.
- Backend code that needs Mongo ObjectIds may convert accepted string IDs at the persistence boundary.

## Serializer Pattern

Preferred API serializer pattern:

```js
{
  id: String(row.id || row._id || row.domainId || ""),
  ...
}
```

Legacy `_id` may be preserved in responses only for compatibility during migration.

## Client Pattern

Preferred client normalization pattern:

```js
const id = String(row.id || row._id || row.domainId || "");
```

After normalization, use `id` for routing and linking.

## Test IDs

Tests may use stable semantic IDs such as `grow-1`, `toolrun-1`, or `facility-1`. They do not need to be UUID-shaped unless a specific third-party integration requires that format.

## Documentation Rule

Docs may show `"uuid"` as an example placeholder only when the surrounding text says IDs are opaque strings. Do not describe all GrowPath IDs as UUID-only.
