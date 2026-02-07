# GrowPath AI Feature Matrix (v1)

Source of truth for AI tools catalog, UI surfaces, and contracts.

---

## Backend Contracts

### AI Call

```
POST /api/facility/:facilityId/ai/call
POST /api/facilities/:facilityId/ai/call (dual mount)

Request body:
{
  tool: string,        // e.g., "harvest", "climate", "ec"
  fn: string,          // e.g., "estimateHarvestWindow", "computeVPD"
  args: object,        // tool-specific inputs
  context: {
    growId: string,
    // other context as needed
  }
}

Response:
{
  success: boolean,
  data: {
    result: any,       // tool-specific output
    writes?: [         // only if persistence occurred
      { type: string, id: string },
      ...
    ]
  } | null,
  error: { code: string, message: string } | null
}
```

### Calendar Read

```
GET /api/facility/:facilityId/calendar
GET /api/facilities/:facilityId/calendar (dual mount)

Query params:
- growId: string (required for filtering)
- type: string (optional, e.g., "HARVEST_WINDOW")
- from: ISO date string (optional)
- to: ISO date string (optional)
- limit: number (default 100, max 200)

Response:
{
  calendarEvents: [
    {
      id: string,
      facilityId: string,
      growId: string,
      type: string,
      title: string,
      date: ISO date string,
      metadata: object,
      createdAt: ISO date string,
      updatedAt: ISO date string,
      deletedAt: ISO date string | null
    },
    ...
  ]
}
```

---

## MVP (Must be End-to-End: Input → Write → Read)

| Tool      | Function                | UI Type                 | Inputs                                                                                      | Output Renderer                                                                            | Writes                                                  | Follow-up Read                             | Guards                                                       | Entitlements |
| --------- | ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ | ------------ |
| `harvest` | `analyzeTrichomes`      | Button + image uploader | `images[]`, `zones?`, `notes?`                                                              | Display `distribution` (%) + `confidence` score                                            | `TrichomeAnalysis` record                               | Optional: GET trichomes list later         | Validation: min 1 image, jpg/png only                        | STAFF+       |
| `harvest` | `estimateHarvestWindow` | Form card               | `daysSinceFlip`, `goal` (balanced\|yield\|potency), `distribution` ({clear, cloudy, amber}) | Display `recommendation`, `partialHarvestFlag`, `confidence`, window dates (min/ideal/max) | `HarvestDecision` + 3× `CalendarEvent` (HARVEST_WINDOW) | GET /calendar?growId=X&type=HARVEST_WINDOW | Spam guard: soft-delete old HARVEST_WINDOW before insert new | STAFF+       |

---

## Phase 1.1 (Demo Upgrades: Read-Only First)

| Tool      | Function              | UI Type                    | Inputs                              | Output Renderer                                              | Writes                                     | Follow-up Read                       | Guards                                      | Entitlements |
| --------- | --------------------- | -------------------------- | ----------------------------------- | ------------------------------------------------------------ | ------------------------------------------ | ------------------------------------ | ------------------------------------------- | ------------ |
| `climate` | `computeVPD`          | Metric card                | `currentTemp` (°F), `currentRH` (%) | Display `vpd` number + color-coded health (red/yellow/green) | None (read-only)                           | None                                 | Range validation: temp -50…130°F, RH 0…100% | STAFF+       |
| `ec`      | `recommendCorrection` | Alert + confirmation modal | `currentEC`, `targetEC`             | Display `deltaEC`, `recommendedAction` (text), `confidence`  | `Task` record (stub: type="EC_CORRECTION") | Later: GET /tasks?type=EC_CORRECTION | 409 gate: confirm before write              | STAFF+       |

---

## Deferred (Disabled / Coming Soon)

All other REGISTRY entries (ec.analyzeNutrientDeficiency, ph.checkBalance, etc.) are:

- Defined in backend REGISTRY
- Render as **disabled cards** with "Coming Soon" label
- No UI inputs or outputs yet
- Planned for Phase 1.2+

---

## Implementation Notes

### Registry Keys (Backend)

Located in `backend/routes/ai.call.js` lines 40-100 (REGISTRY object):

```javascript
const REGISTRY = {
  harvest: {
    analyzeTrichomes: handleHarvestAnalyzeTrichomes,
    estimateHarvestWindow: handleHarvestEstimateWindow
    // ...
  },
  climate: {
    computeVPD: handleClimateComputeVPD
    // ...
  },
  ec: {
    recommendCorrection: handleEcRecommendCorrection
    // ...
  }
  // ... more tools
};
```

### UI Rendering Strategy

1. **AIToolsScreen** reads a `FEATURE_CONFIG` array (hardcoded, matches matrix above)
2. Each config entry has: `{ tool, fn, uiType, label, enabled, inputs, outputRenderer }`
3. **Enabled** entries: full form + button + result display
4. **Disabled** entries: card with "Coming Soon" + lock icon
5. Each enabled card routes to a dedicated sub-screen (e.g., HarvestWindowScreen, VpdCalcScreen)

### Calendar Spam Guard

- Before `HarvestDecision.create()` + `CalendarEvent.insertMany()`:
  ```javascript
  await CalendarEvent.updateMany(
    { facilityId, growId, type: "HARVEST_WINDOW", deletedAt: null },
    { deletedAt: new Date() }
  );
  ```
- This prevents duplicate HARVEST_WINDOW events when user re-estimates the same grow
- Reads still filter `deletedAt: null`, so old events are invisible

### Error Handling

- AI call errors: Wrapped in envelope `{ success: false, data: null, error: {...} }`
- Calendar read errors: 400 for bad query params, 500 for DB failures (caught by global middleware)
- Frontend: Both hooks (`useAICall`, `useCalendarEvents`) handle envelope + network errors

---

## Roadmap

**Phase MVP (Now)**

- ✅ Harvest window estimator (end-to-end write + read)
- ✅ Calendar read with filtering
- ✅ Backend contract tests (17 passing)
- ✅ Frontend hooks (useAICall, useCalendarEvents)

**Phase 1.1 (Next)**

- VPD calculator (read-only metric)
- EC recommendation (with confirmation modal)
- Auth token integration (currently optional)

**Phase 1.2+**

- Real trichome CV (currently mock form)
- Nutrient deficiency analyzer
- pH balance checker
- Soil moisture recommendations
- Light schedule optimizer
- Yield prediction
- Cost-benefit analyzer

---

## Versioning

- **v1**: MVP + Phase 1.1 frame (this document)
- **v1.0.1**: Schema validation layer (if needed)
- **v2**: Auth enforcement, audit logging, webhook triggers
