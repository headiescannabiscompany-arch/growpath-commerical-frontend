# Harvest Window Flow - End-to-End Test Plan

## Prerequisites

- Expo Web running on http://localhost:8082 (CORS-allowed origin)
- Backend running on http://localhost:5001
- Backend CORS allowlist includes http://localhost:8082
- DevTools open (F12) with Console + Network tabs visible

## Step 1: Verify CORS + Auth (API Me)

Run in browser console:

```javascript
fetch("http://localhost:5001/api/me", {
  headers: {
    Authorization: "Bearer <your-token-here>"
  }
})
  .then((r) => r.json())
  .then((data) => console.log("✅ /api/me response:", data))
  .catch((err) => console.error("❌ /api/me failed:", err));
```

**Expected**:

- Status 200
- Response body with user data
- No CORS error in console

**If CORS fails**: Backend allowlist doesn't include 8082, or CORS headers missing.

## Step 2: Navigate UI Flow

In app:

1. **Log in** → Commercial facility mode
2. **Tap Facility tab** → AI tab
3. **See AI Tools home**
   - Button "Select Grow" should be visible
   - Harvest card should show "Select Grow" badge + disabled
4. **Tap "Select Grow"**
   - Navigate to SelectGrow screen
   - Enter: `GROW_TEST_001`
   - Tap "Use This Grow"
5. **Back to AI Tools Home**
   - "Select Grow" button gone
   - Harvest card enabled (tappable)
6. **Tap "Estimate Harvest Window"**
   - Form opens
   - Fill: daysSinceFlip=30, goal="balanced", distribution="cloudy"
   - Tap "Estimate"

## Step 3: Capture Network Request

In **Network tab**:

1. Filter by "ai/call"
2. Click the POST request
3. Copy entire request details:

### Request

```
POST http://localhost:5001/api/facility/<facilityId>/ai/call
Headers:
  Origin: http://localhost:8082
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "tool": "harvest",
  "fn": "estimateHarvestWindow",
  "args": {
    "daysSinceFlip": 30,
    "goal": "balanced",
    "distribution": "cloudy"
  },
  "context": {
    "growId": "GROW_TEST_001"
  }
}
```

### Response

Copy the full JSON response (should include window, confidence, writes).

## Step 4: Validate Response Shape

Expected response structure:

```json
{
  "success": true,
  "data": {
    "window": {
      "startDate": "2026-03-08T00:00:00Z",
      "endDate": "2026-03-22T00:00:00Z"
    },
    "confidence": 0.85,
    "recommendation": "Harvest when...",
    "writes": [
      { "type": "HarvestDecision", "id": "..." },
      { "type": "CalendarEvent", "id": "..." },
      { "type": "CalendarEvent", "id": "..." },
      { "type": "CalendarEvent", "id": "..." }
    ]
  },
  "error": null
}
```

**Verify**:

- ✅ success: true
- ✅ window.startDate and .endDate present
- ✅ confidence is a number (0-1)
- ✅ writes array has 4 items (1 HarvestDecision + 3 CalendarEvents)
- ✅ error is null

## Step 5: UI Result Display

After response received:

- Result card should show:
  - Confidence score (0-1 or %)
  - Recommendation text
  - Harvest window dates
  - Writes audit trail (4 rows)

## Step 6: Back Button + Persistence

- Tap back
- Should return to AI Tools Home
- growId should still be "GROW_TEST_001" (route params persisted)
- Harvest card still enabled

## Troubleshooting

### CORS Error on /api/me

```
Access to XMLHttpRequest at 'http://localhost:5001/api/me' from origin
'http://localhost:8082' has been blocked by CORS policy
```

**Fix**: Backend CORS allowlist must include http://localhost:8082

### 401 on /api/call

```
{ "code": "UNAUTHORIZED", "message": "No auth token" }
```

**Fix**: Token missing or expired. Verify Authorization header in Network tab.

### 404 on /api/facility/:facilityId/ai/call

```
{ "code": "NOT_FOUND", "message": "Route not found" }
```

**Fix**: Backend didn't mount the AI router. Check backend logs.

### Form data not matching contract

If request body doesn't match expected structure, paste the actual request body here.

## Next Steps (After Success)

1. Run backend contract tests:

   ```bash
   npm run test:ai  # or your backend test command
   ```

2. Check database: did HarvestDecision + CalendarEvents get created?

3. Try other tools (ComputeVPD, etc.) to verify matrix pattern works

---

**Report results here with:**

- ✅ or ❌ for each step
- Full request/response JSON for /ai/call
- Any error messages from console or network tab
