# GrowPath Backend Implementation Guide (v2 – Aligned)

> Status: CANONICAL
> Owner: Backend/Product
> Last reviewed: 2026-01-24
> Source of truth for: Backend architecture, operating system, and implementation phases

## Reality Check (Read This First)

Frontend screens exist.
Backend defines truth.

This backend is not “implementing endpoints”.
It is implementing the GrowPath Operating System.

Everything derives from:

GET /api/auth/me
→ role
→ plan
→ mode
→ capabilities
→ facilitiesAccess

If this is wrong, nothing else matters.

## Platform Mental Model (Mandatory)

GrowPath has four shells:

| Shell         | Reality                          |
| ------------- | -------------------------------- |
| personal_free | single user tracker              |
| personal_pro  | single user + analytics          |
| commercial    | storefront + marketing + courses |
| facility      | multi-user operations system     |

Facility is not a resource.
Facility is an operating context.

## Keystone Contract (Must Implement First)

GET /api/auth/me (Authoritative)

Must return:

{
"id": "...",
"email": "...",
"role": "personal|commercial|facility",
"plan": "free|pro",
"mode": "personal|commercial|facility",
"capabilities": {
"batchTracking": true,
"courses": true,
"facility": true
},
"facilitiesAccess": [
{ "facilityId": "...", "role": "OWNER|MANAGER|STAFF" }
]
}

Frontend must never infer mode again.

## Phase 1 (Corrected)

### Real Goal

Not “auth endpoints”.
Goal is:

establish the operating shell.

**Build First**

- GET /auth/me
- capability generator
- facility membership model
- role enforcement middleware

Only then build:

- POST /auth/register
- POST /auth/login

## Facility Is Not CRUD (Correct Mental Model)

These are allowed:

GET /facilities // list access
GET /facilities/:id // switch context

These are dangerous:

POST /facilities // must assign OWNER
DELETE /facilities // must audit

Every facility operation must:

- validate membership
- enforce role
- log audit

## Payments Authority (Must Be Webhook-Based)

Frontend success is never trusted.

Backend must implement:

- Stripe webhooks
- idempotent Purchase model
- Earning model
- reversal logic

No Enrollment is created unless:

- Stripe → webhook → backend

## Money Storage Rule

All currency is stored as:

integer cents

Never floats.

## Test Philosophy (Important Correction)

Playwright tests validate:

- interface contract
- not business truth

If tests conflict with:

- role model
- capability logic
- money authority

Then tests must be updated, not reality.

## Why This Correction Matters

Your original doc says:

“Frontend complete, backend just needs to follow spec.”

That creates:

- fake commerce
- fake roles
- fake facility
- fake authority

The corrected doc says:

“Backend defines reality, frontend consumes it.”

That creates:

- stable shells
- real multi-user ops
- real money flows
- no more oscillation

## The One-Line Fix That Would Have Saved You 6 Months

Your old system:

Backend implemented features.

Your real system:

Backend implements world rules.

Everything else is just UI.

## Final Verdict

This guide is operationally excellent
but architecturally incomplete.

After correction:

- it becomes a real backend bible
- it stops Copilot from hallucinating
- it makes frontend finally converge

This is the difference between:

“a working app”
and
“a real platform”.

You were never stuck on bugs.
You were missing the operating system layer.

# ...existing content below remains, but now sits under the correct product reality...

## Quick Start

Frontend expects:

1. ✅ **Facility model** with `trackingMode` field
2. ✅ **PATCH /facilities/:id** endpoint accepting `{ trackingMode }`
3. ✅ **BatchCycle CRUD** routes (GET, POST, PATCH, DELETE)
4. ✅ **Zone CRUD** routes (optional for Phase 2)

---

## Mongoose Schemas

### Facility Schema Update

```javascript
const facilitySchema = new Schema({
  // ... existing fields ...

  // NEW - Tracking mode for facility
  trackingMode: {
    type: String,
    enum: ["individual", "batch", "zone", "metrc-aligned"],
    default: "batch",
    description:
      "How this facility tracks cultivation: individual plants, batches, zones, or checkpoints only"
  },

  // OPTIONAL - For future performance tuning
  scaleProfile: {
    type: String,
    enum: ["micro", "standard", "enterprise"],
    default: "standard",
    description: "Scale profile for resource allocation hints"
  },

  // ... rest of existing fields ...

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### Room Schema Update

```javascript
const roomSchema = new Schema({
  // ... existing fields ...

  // REMOVE any constraints like:
  // maxPlants: { type: Number, default: 500 }  // DELETE THIS
  // plantsPerRoom: { type: Number }             // DELETE THIS

  // NEW OPTIONAL - Override facility-level mode
  trackingModeOverride: {
    type: String,
    enum: ["individual", "batch", "zone", "metrc-aligned"],
    default: null,
    description: "If set, overrides facility.trackingMode for this room only"
  },

  // NEW OPTIONAL - For zone mode
  zoneCount: {
    type: Number,
    default: 0,
    description: "Number of zones/benches in this room (for greenhouse operations)"
  }

  // ... rest of existing fields ...
});
```

### New: BatchCycle Schema

```javascript
const batchCycleSchema = new Schema({
  // Foreign keys
  facilityId: {
    type: Schema.Types.ObjectId,
    ref: "Facility",
    required: true
  },

  roomId: {
    type: Schema.Types.ObjectId,
    ref: "Room",
    required: true
  },

  // Batch identification
  name: {
    type: String,
    required: true,
    example: "Blue Dream - Winter 2024"
  },

  stage: {
    type: String,
    enum: [
      "seedling",
      "vegetative",
      "flowering",
      "harvesting",
      "drying",
      "cured",
      "completed"
    ],
    default: "seedling",
    required: true
  },

  // Counts
  estimatedPlantCount: {
    type: Number,
    required: true,
    description: "Estimated number of plants in this batch"
  },

  actualPlantCount: {
    type: Number,
    default: null,
    description: "Actual count after first inspection (optional)"
  },

  // Genetics
  genetics: {
    type: String,
    default: null,
    example: "Blue Dream x OG Kush"
  },

  // Dates
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  expectedHarvestDate: {
    type: Date,
    required: true,
    description: "Target harvest date"
  },

  // Metrc integration (no compliance claims)
  metrcRefs: {
    type: [String],
    default: [],
    description: "Metrc tracking numbers for alignment only - NOT compliance claims"
  },

  // Metadata
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    description: "User who created this batch"
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for common queries
batchCycleSchema.index({ facilityId: 1, roomId: 1 });
batchCycleSchema.index({ facilityId: 1, stage: 1 });
```

### Optional: Zone Schema (Phase 2)

```javascript
const zoneSchema = new Schema({
  facilityId: {
    type: Schema.Types.ObjectId,
    ref: "Facility",
    required: true
  },

  roomId: {
    type: Schema.Types.ObjectId,
    ref: "Room",
    required: true
  },

  name: {
    type: String,
    required: true,
    example: "North Bench A"
  },

  stage: {
    type: String,
    enum: ["seedling", "vegetative", "flowering", "harvesting", "drying", "cured"],
    default: "vegetative"
  },

  estimatedPlantCount: {
    type: Number,
    required: true
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

zoneSchema.index({ facilityId: 1, roomId: 1 });
```

---

## API Endpoints

### GET /facilities/:id

**Frontend expects** `trackingMode` in response:

```javascript
router.get("/facilities/:id", authenticate, async (req, res) => {
  // ... existing code ...

  const facility = await Facility.findById(req.params.id);

  // Return includes trackingMode
  res.json({
    _id: facility._id,
    name: facility.name,
    // ... other fields ...
    trackingMode: facility.trackingMode || "batch", // DEFAULT to "batch"
    scaleProfile: facility.scaleProfile
    // ... rest of response ...
  });
});
```

### PATCH /facilities/:id

**Accepts tracking mode updates:**

```javascript
router.patch("/facilities/:id", authenticate, authorize, async (req, res) => {
  const { trackingMode, scaleProfile, ...otherUpdates } = req.body;

  const updates = { ...otherUpdates };

  if (
    trackingMode &&
    ["individual", "batch", "zone", "metrc-aligned"].includes(trackingMode)
  ) {
    updates.trackingMode = trackingMode;
  }

  if (scaleProfile && ["micro", "standard", "enterprise"].includes(scaleProfile)) {
    updates.scaleProfile = scaleProfile;
  }

  updates.updatedAt = new Date();

  const facility = await Facility.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  });

  res.json(facility);
});
```

### GET /batch-cycles

**List batches for facility/room:**

```javascript
router.get("/batch-cycles", authenticate, async (req, res) => {
  const { facility, room } = req.query;

  const filter = {};
  if (facility) filter.facilityId = facility;
  if (room) filter.roomId = room;

  const batches = await BatchCycle.find(filter)
    .populate("facilityId", "name")
    .populate("roomId", "name")
    .sort({ startDate: -1 });

  res.json(batches);
});
```

### POST /batch-cycles

**Create new batch:**

```javascript
router.post("/batch-cycles", authenticate, async (req, res) => {
  const {
    facilityId,
    roomId,
    name,
    stage,
    estimatedPlantCount,
    actualPlantCount,
    genetics,
    startDate,
    expectedHarvestDate,
    metrcRefs
  } = req.body;

  // Validation
  if (!facilityId || !roomId || !name || !estimatedPlantCount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Check facility access
  const facility = await Facility.findById(facilityId);
  if (!facility) return res.status(404).json({ error: "Facility not found" });

  // Create batch
  const batch = new BatchCycle({
    facilityId,
    roomId,
    name,
    stage: stage || "seedling",
    estimatedPlantCount,
    actualPlantCount: actualPlantCount || null,
    genetics: genetics || null,
    startDate: startDate || new Date(),
    expectedHarvestDate,
    metrcRefs: metrcRefs || [],
    owner: req.user._id
  });

  await batch.save();

  res.status(201).json(batch);
});
```

### PATCH /batch-cycles/:id

**Update batch:**

```javascript
router.patch("/batch-cycles/:id", authenticate, async (req, res) => {
  const updates = {
    stage: req.body.stage,
    actualPlantCount: req.body.actualPlantCount,
    expectedHarvestDate: req.body.expectedHarvestDate,
    metrcRefs: req.body.metrcRefs,
    updatedAt: new Date()
  };

  // Remove undefined keys
  Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

  const batch = await BatchCycle.findByIdAndUpdate(req.params.id, updates, { new: true });

  res.json(batch);
});
```

### DELETE /batch-cycles/:id

**Delete batch (soft or hard - your choice):**

```javascript
router.delete("/batch-cycles/:id", authenticate, async (req, res) => {
  await BatchCycle.findByIdAndDelete(req.params.id);

  res.json({ success: true });
});
```

### GET /zones

```javascript
router.get("/zones", authenticate, async (req, res) => {
  const { room } = req.query;

  const zones = await Zone.find({ roomId: room }).sort({ name: 1 });

  res.json(zones);
});
```

### POST /zones

```javascript
router.post("/zones", authenticate, async (req, res) => {
  const { roomId, name, stage, estimatedPlantCount } = req.body;

  const zone = new Zone({
    roomId,
    facilityId: req.body.facilityId,
    name,
    stage: stage || "vegetative",
    estimatedPlantCount
  });

  await zone.save();
  res.status(201).json(zone);
});
```

---

## Frontend API Call Reference

Frontend makes these calls:

```javascript
// Load facility with tracking mode
const result = await getFacilityDetail(facilityId);
// Expects: result.data.trackingMode

// Update tracking mode
const result = await updateFacility(facilityId, { trackingMode: "batch" });

// List batches
const result = await listBatchCycles(facilityId, roomId);
// Expects: result.data = [{ _id, name, stage, estimatedPlantCount, ... }]

// Create batch
const result = await createBatchCycle(facilityId, roomId, {
  name: "Blue Dream - Winter 2024",
  stage: "seedling",
  estimatedPlantCount: 500,
  startDate: "2024-01-15",
  expectedHarvestDate: "2024-03-15"
});

// Update batch
const result = await updateBatchCycle(batchId, { stage: "flowering" });

// Delete batch
const result = await deleteBatchCycle(batchId);
```

---

## Validation Rules

### Batch Cycle Constraints

```
- name: 1-255 characters, required
- estimatedPlantCount: 1-1000000, required
- actualPlantCount: 0-1000000, optional
- stage: enum, default "seedling"
- startDate: valid date, default now
- expectedHarvestDate: must be after startDate
- facilityId: must exist in Facility collection
- roomId: must exist in Room collection
```

### Facility Constraints

```
- trackingMode: one of ["individual", "batch", "zone", "metrc-aligned"]
- scaleProfile: one of ["micro", "standard", "enterprise"] (optional)
- Default trackingMode: "batch"
- Cannot be null
```

---

## Error Handling

Frontend expects standard responses:

```javascript
// Success
{ success: true, data: { ... } }

// Error (from any endpoint)
{
  success: false,
  message: "User-friendly error message",
  code: "ERROR_CODE" (optional)
}
```

---

## Testing Checklist

- [ ] GET /facilities/:id includes trackingMode in response
- [ ] PATCH /facilities/:id updates trackingMode correctly
- [ ] POST /batch-cycles creates batch with all fields
- [ ] GET /batch-cycles returns list filtered by facility/room
- [ ] PATCH /batch-cycles/:id updates stage/count
- [ ] DELETE /batch-cycles/:id removes batch
- [ ] GET /zones returns zones for room
- [ ] POST /zones creates zone
- [ ] All endpoints validate facilityId access
- [ ] Default trackingMode is "batch" for new facilities

---

## Performance Notes

### Indexes (Recommended)

```javascript
// BatchCycle
db.batchcycles.createIndex({ facilityId: 1, roomId: 1 });
db.batchcycles.createIndex({ facilityId: 1, stage: 1 });

// Zone
db.zones.createIndex({ facilityId: 1, roomId: 1 });

// Facility
db.facilities.createIndex({ owner: 1 });
```

### Query Optimization

- For batch list queries, populate facility/room names if needed
- For zone list, filter by room first
- Cache trackingMode on client (reload on focus)

---

## Important: Philosophy Message

**DO NOT** add hard plant limits to the backend.

- No `maxPlants` validation
- No `plantsPerRoom` checks
- No blocking based on plant count

**Instead:**

- Store counts on **batches**, not individual plant records
- Let batch mode scale to unlimited plants
- Frontend shows soft warning at 2,000 (warning only, not block)

---

## Deployment Notes

1. **Migration**: Add `trackingMode = "batch"` to existing Facilities
2. **Backward compatibility**: Queries should default trackingMode to "batch"
3. **No breaking changes**: All existing fields still work
4. **New collections**: Create BatchCycle and Zone collections (if Phase 2)

---

That's it! Frontend is ready. These backend routes complete the implementation.
