# Golden End-to-End Test: Harvest Window AI

**Objective**: Prove the entire Harvest Window feature works end-to-end with a real backend request/response.

**Prerequisites**:

- Backend running (`npm run dev` from C:\growpath-commercial\backend)
- Frontend running on http://localhost:8082 (`npm run expo` from C:\growpath-commercial\frontend)
- Chrome DevTools open (F12)

---

## Test Flow

### Step 1: Open DevTools and Prepare Network Tab

1. Open http://localhost:8082 in browser
2. Open DevTools → **Network** tab
3. **Filter** by `/ai/call` (will show only AI requests)
4. Leave DevTools open throughout test

### Step 2: Log In & Navigate to AI Tools

1. Log in with a commercial facility account (or use test headers if mocking)
2. Tap **Facility** tab (bottom nav)
3. Tap **AI** tab
4. You should see: **AI Tools** header with cards for Harvest, Trichome, ComputeVPD, ECRecommend

### Step 3: Select a Grow

1. See **"Select Grow"** button (top of AI Tools home)
2. Tap it
3. Enter grow ID: `GROW_TEST_001`
4. Tap **"Use This Grow"**
5. Back on AI Tools home, button should disappear and Harvest card should be **enabled** (tappable)

### Step 4: Tap "Estimate Harvest Window"

1. Tap the **Harvest Window** card
2. Form opens with fields:
   - Days since flip: `65` (default)
   - Goal: `balanced` (radio buttons)
   - Trichome distribution: Clear 0.25, Cloudy 0.65, Amber 0.10 (defaults)
3. Tap **"Estimate Harvest Window"** button
4. Loading spinner should appear

### Step 5: Check Network Request

While loading (or after response), in DevTools **Network** tab:

1. Click on the **POST** request to `/api/facility/.../ai/call`
2. **Request** tab: Verify payload is:

```json
{
  "tool": "harvest",
  "fn": "estimateHarvestWindow",
  "args": {
    "daysSinceFlip": 65,
    "goal": "balanced",
    "distribution": {
      "clear": 0.25,
      "cloudy": 0.65,
      "amber": 0.1
    }
  },
  "context": {
    "growId": "GROW_TEST_001"
  }
}
```

✅ **Expected**: Payload matches exactly (no wrapping or reshaping)

3. **Response** tab: Verify response is:

```json
{
  "success": true,
  "tool": "harvest",
  "fn": "estimateHarvestWindow",
  "growId": "GROW_TEST_001",
  "result": {
    "window": {
      "earliest": "YYYY-MM-DD",
      "latest": "YYYY-MM-DD"
    },
    "confidence": 0.74,
    "recommendation": "...",
    "calendarWrites": [
      { "type": "MONITOR", "date": "...", "note": "..." },
      { "type": "TARGET", "date": "...", "note": "..." },
      { "type": "HARD_STOP", "date": "...", "note": "..." }
    ]
  }
}
```

✅ **Expected**:

- `success: true`
- `result.window.earliest` and `.latest` present (ISO dates)
- `result.confidence` between 0 and 1
- `result.recommendation` is a string
- `result.calendarWrites.length === 3`

### Step 6: Verify UI Result Display

Back in app:

1. Result card should appear below the form
2. Shows:
   - Recommendation text
   - Confidence as percentage (e.g., "74%")
   - Earliest: YYYY-MM-DD
   - Latest: YYYY-MM-DD
   - **Writes (Persisted)** section with 3 entries (MONITOR, TARGET, HARD_STOP)

✅ **Expected**: All fields render correctly with data from response

### Step 7: Refresh Calendar & Verify Persistence

1. Scroll down to **Calendar (HARVEST_WINDOW)** section
2. Tap **"Refresh Calendar"** button
3. You should see 3 calendar events created:
   - MONITOR
   - TARGET
   - HARD_STOP

✅ **Expected**: 3 events appear with correct dates from `calendarWrites`

### Step 8: Test Back Button & Persistence

1. Tap device back button
2. Should return to AI Tools home
3. "Select Grow" button should still be gone (growId persisted)
4. Harvest card should still be enabled
5. Tap Harvest card again → form reopens with previous values intact

✅ **Expected**: Route params (growId) persist across back/forward

---

## Troubleshooting

### Request Fails (404/400)

**Check DevTools Network**:

- Status 404: Backend route not found. Restart backend, confirm `POST /api/facility/:facilityId/ai/call` is mounted.
- Status 400: Validation error. Confirm payload matches contract exactly (check `args` keys and `context.growId`).
- Status 401: Auth issue. Ensure token is sent in Authorization header.

### Response Missing Fields

**Check console**: Look for TypeScript/parsing errors.

**Expected response shape**:

```typescript
result.window.earliest; // NOT .min, NOT .ideal, NOT .max
result.window.latest;
result.confidence; // 0-1 scale, NOT percentage
result.calendarWrites; // array of objects with type, date, note
```

### UI Not Showing Result

**Check browser console**: `F12 → Console` for errors.

**Common issues**:

- Response fields named differently than expected (see above)
- Response nested wrong (should be `result.window`, not `result.harvest.window`)
- TypeScript type errors preventing render

### "Select Grow" Button Doesn't Appear

**Issue**: growId is already set (in route params or state).

**Fix**: Clear browser storage (`F12 → Application → Local Storage → Clear`) and refresh.

---

## Success Criteria

All of the following must be true:

- ✅ Request payload matches contract exactly
- ✅ Response status 200
- ✅ Response has `success: true`
- ✅ Response has `result.window.earliest` and `.latest`
- ✅ Response has `result.confidence` (0-1 scale)
- ✅ Response has `result.calendarWrites` with 3 items
- ✅ UI displays all result fields
- ✅ Calendar refresh shows 3 persisted events
- ✅ Back button preserves growId and card state

**If all pass**: Harvest Window feature is **production-ready**.

---

## Report Template

Paste this when reporting results:

```
✅ Request payload correct
Status: [200 / 400 / 404 / other]
Response success: [true / false]
window.earliest: [present / missing]
window.latest: [present / missing]
confidence: [0.XX / missing]
calendarWrites.length: [3 / other]
UI result displayed: [yes / no]
Calendar events shown: [3 / other]
Back button persistence: [works / broken]
```

---

## Next Steps After Success

1. **Commit**: `git add . && git commit -m "Harvest Window AI feature complete"`
2. **Add second tool**: Copy pattern from harvest.estimateHarvestWindow to next tool
3. **Confidence gating**: Add modal for results < 0.6 confidence
4. **Calendar sync**: Ensure calendarWrites persist to actual calendar
