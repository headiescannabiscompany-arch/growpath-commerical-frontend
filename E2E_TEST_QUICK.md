# Quick E2E Test Verification

## What to Test

**Goal**: Verify end-to-end AI call works: form → backend → calendar → UI

**Setup** (one-time):

```bash
# Terminal 1: Backend
cd c:\growpath-commercial\backend
npm start
# Wait for: "Server running on port 5001" + "MongoDB connected"

# Terminal 2: Frontend
cd c:\growpath-commercial\frontend
npm start
# Wait for: "Expo Web running on http://localhost:8082"
```

## Test Steps

1. **Open Browser**
   - Navigate to http://localhost:8082
   - Log in (if needed)

2. **Select Facility & AI**
   - Tap "Facility" tab
   - Tap "AI" sub-tab
   - See "Harvest Window" card (enabled)
   - Other cards show "Not available yet"

3. **Select Grow** (if not already selected)
   - Tap "Select Grow" button or "Select Grow" badge
   - Enter grow ID: `GROW_TEST_001` (or your real grow ID)
   - Tap back arrow (→ AI tools home)
   - "Harvest Window" card now enabled

4. **Tap Harvest Window**
   - Opens form with 3 inputs:
     - Days since flip: 65
     - Goal buttons: balanced (selected), yield, potency
     - Trichome distribution: clear 0.25, cloudy 0.65, amber 0.10

5. **Run Estimate**
   - Tap "Estimate Harvest Window" button
   - Loading spinner appears
   - ~2 second wait

6. **Verify Result**
   - Should see card with:
     - ✅ Recommendation: HARVEST_NOW (or similar)
     - ✅ Confidence: 87% (or similar, as 0-100%)
     - ✅ Earliest: 2025-07-15 (or similar date)
     - ✅ Latest: 2025-07-22 (or similar date)
     - ✅ Writes (Persisted): [3 items, type=HARVEST_WINDOW]

7. **Verify Network** (DevTools)
   - Open DevTools → Network tab
   - Tap "Estimate" again
   - Find POST to `/api/facility/[ID]/ai/call`
   - Request body should be:
     ```json
     {
       "tool": "harvest",
       "fn": "estimateHarvestWindow",
       "args": {
         "daysSinceFlip": 65,
         "goal": "balanced",
         "distribution": { "clear": 0.25, "cloudy": 0.65, "amber": 0.1 }
       },
       "context": { "growId": "GROW_TEST_001" }
     }
     ```
   - Response status: 200
   - Response body should have:
     ```json
     {
       "success": true,
       "result": {
         "recommendation": "...",
         "confidence": 0.87,
         "window": {
           "earliest": "...",
           "latest": "..."
         },
         "calendarWrites": [...]
       }
     }
     ```

8. **Verify Calendar**
   - In result card, tap "Refresh Calendar" button
   - Should see list of 3 HARVEST_WINDOW events
   - Each item shows: `• HARVEST_WINDOW: [id]`

9. **Verify State Persistence**
   - Tap back button (← arrow in header)
   - Back on AI tools home
   - Grow ID still shown/set
   - "Harvest Window" card still enabled

10. **Verify Re-entry**
    - Tap "Harvest Window" again
    - Form is empty (fresh state)
    - Fill again + submit
    - Works second time (no bugs on retry)

## Success Criteria

✅ All steps complete without errors
✅ Network request matches contract (tool/fn/args/context)
✅ Network response matches contract (success/result/confidence/window)
✅ UI displays recommendation, confidence as %, earliest, latest
✅ Calendar shows 3 events after refresh
✅ Back button preserves growId
✅ Retry works (form clears, submit succeeds)

## If Something Fails

**"Backend not found" or 502 error**:

- Verify backend is running: `curl http://localhost:5001/api/health`
- Check backend logs for errors

**"CORS error" or 403 in DevTools**:

- Backend allowlist includes port 8082: ✅ verified
- Check preflight: `curl -i -X OPTIONS -H "Origin: http://localhost:8082" http://localhost:5001/api/me`
- Should return 204

**"Tool not found" or 404**:

- Verify backend has `AI_TOOLS.harvest.estimateHarvestWindow` implemented
- Check backend logs: `[AI Dispatcher] harvest.estimateHarvestWindow called`

**"Invalid response" or blank result**:

- Check Network tab: response body should have `result.window.earliest/.latest`
- Not `result.window.min/ideal/max` (old format)
- Frontend expects: `{ window: { earliest, latest }, confidence 0-1, ... }`

**Grow ID not sticking**:

- SelectGrow callback may not be wired correctly
- Check: Does growId persist in route params when navigating back?
- Try: Close tab and reopen → should still be set (persisted in URL)

## Abort Conditions

Stop testing and report to AI team if:

- Backend crashes on AI call
- Frontend crashes on response parsing
- Network request doesn't match contract (different field names)
- Network response doesn't match contract (missing fields)
- CORS error appears (403, origin not allowed)

## Success Report

After successful test, send:

> ✅ **E2E Test PASSED**
>
> - Form submission successful
> - Network request: POST /api/facility/:facilityId/ai/call
> - Payload: {tool: "harvest", fn: "estimateHarvestWindow", args: {...}, context: {growId: ...}}
> - Response: 200 {success: true, result: {recommendation, confidence, window.earliest, window.latest}}
> - UI rendered result correctly
> - Calendar showed 3 HARVEST_WINDOW events
> - Back button preserved growId
>
> Ready for: Next tool implementation (climate.computeVPD) or phase 1.1 enablement

---

**Estimated time**: 5-10 minutes
**No code changes needed**: All frontend/backend ready to test as-is
