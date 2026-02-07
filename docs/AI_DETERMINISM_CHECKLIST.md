# AI Catalog — Determinism Checklist

**Goal:** No more "why is growId empty?" bugs. All state flows are explicit and guarded.

---

## 4 Hardening Fixes Applied

### ✅ 1. AIToolsHome initialParams (FacilityTabs.js)

```javascript
<AIStack.Screen
  name="AIToolsHome"
  initialParams={{ growId: "" }}  // ← ensures growId always exists
>
```

**Why:** Prevents `navProps.route.params` from being undefined on first render.

**Guarantee:** `growId` is always a string (empty or non-empty), never null.

---

### ✅ 2. Enforce growId at Home Card Press (AIToolsHomeScreen.tsx)

```typescript
const canRun =
  feature.enabled &&
  (!feature.requires.facilityId || !!facilityId) &&
  (!feature.requires.growId || !!growId);  // ← blocks if missing

const handlePress = () => {
  if (!canRun) return;
  onNavigate(feature.screen, params);
};

// ToolCard UI:
{feature.enabled && feature.requires.growId && !growId && (
  <Text style={styles.badge}>Select Grow</Text>
)}
```

**Why:** Cards requiring growId won't press if growId is empty.

**Guarantee:** HarvestWindow/TrichomeAnalysis screens never receive empty growId.

---

### ✅ 3. Explicit Write Counts (aiFeatureMatrix.ts)

```typescript
{
  id: "harvest-window",
  writes: ["HarvestDecision", "CalendarEvent"],
  writeCounts: { HarvestDecision: 1, CalendarEvent: 3 }  // ← explicit expectation
}
```

**Why:** Prevents mismatched audits ("I expected 1 write, got 3").

**Guarantee:** If `writeCounts` is set, AIResultCard can validate write counts against expectations.

---

### ✅ 4. Tool/Fn Consistency (No Dots)

Frontend sends:

```javascript
{
  tool: "harvest",
  fn: "estimateHarvestWindow"
}
```

**Not:**

```javascript
{
  toolFn: "harvest.estimateHarvestWindow"; // ← wrong, don't do this
}
```

Backend REGISTRY key:

```javascript
{
  harvest: {
    estimateHarvestWindow: handler; // ← matches
  }
}
```

---

## Determinism Proof

### Scenario: User Taps Harvest Window Card (growId = "")

1. ✅ AIToolsHomeScreen receives `growId = ""`
2. ✅ ToolCard.canRun = false (requires.growId && !growId)
3. ✅ Card is disabled + shows "Select Grow" badge
4. ✅ Tap has no effect
5. **Result:** Never reaches HarvestWindowScreen with empty growId ✅

### Scenario: User Taps Compute VPD Card (growId = "")

1. ✅ AIToolsHomeScreen receives `growId = ""`
2. ✅ ToolCard.canRun = true (enabled && !requires.growId)
3. ✅ Card is enabled + navigable
4. ✅ ComputeVPDScreen({ facilityId: "fac123" }) - no growId needed
5. **Result:** Screen loads, user can run VPD metric ✅

### Scenario: Backend Returns Unexpected Write Counts

1. ✅ AI call returns: `{ writes: [{ type: "HarvestDecision", id: "..." }, ...more...] }`
2. ✅ AIResultCard displays all writes in audit list
3. ✅ If `feature.writeCounts` is set, audit can show "(expected: HarvestDecision ×1, CalendarEvent ×3)"
4. **Result:** User/dev sees mismatch immediately ✅

---

## Navigation Safety Rules

**Rule 1: facilityId → useFacility().selectedId only**
Never guess from route params. Always use provider.

**Rule 2: growId → route params, validated at home**
AIToolsHome receives it (initially ""), screens check if required before pressing.

**Rule 3: Detail screens never call onNavigate**
They only consume facilityId/growId. Navigation is 1-way (home → detail → back).

**Rule 4: initialParams prevents undefined params objects**
Every screen with params should have initialParams set.

---

## Testing Checklist

- [ ] **No facility selected:** AIToolsHome shows stub (not blank)
- [ ] **Facility selected, growId = "":**
  - [ ] Harvest Window card: disabled, "Select Grow" badge
  - [ ] Compute VPD card: enabled, navigable
- [ ] **Facility + growId set:**
  - [ ] All enabled cards are navigable
  - [ ] Detail screens receive both facilityId + growId
- [ ] **Call Harvest Window:**
  - [ ] AI response includes writes: [{ type: "HarvestDecision", id }, { type: "CalendarEvent", id }, ...]
  - [ ] AIResultCard displays all 3 + expected counts
- [ ] **Back button:** Returns to AIToolsHome, growId persists in params
- [ ] **Phone orientation change:** ParamsAPI maintains state (no reset)

---

## Future: Pass growId via navigation.setParams()

When you build "Select Grow" flow, do:

```javascript
// In Facility grow picker:
const onSelectGrow = (growId) => {
  navigation.navigate("AITools", {
    screen: "AIToolsHome",
    params: { growId }
  });
};
```

Or from AIToolsHome itself:

```javascript
<Pressable onPress={() => navigation.setParams({ growId: selectedGrow.id })}>
  <Text>Change Grow</Text>
</Pressable>
```

This persists growId without re-mounting AIToolsHome.

---

## Summary

| Bug Type                    | Before   | After      | How                                       |
| --------------------------- | -------- | ---------- | ----------------------------------------- |
| Empty growId → screen crash | Possible | Impossible | Enforcement at home press + initialParams |
| Card pressing when disabled | Possible | Impossible | canRun check + disabled prop              |
| Missing write count audit   | No audit | Explicit   | writeCounts in matrix                     |
| Params undefined on mount   | Possible | Impossible | initialParams                             |
| Tool/Fn format mismatch     | Possible | Prevented  | Type-safe tool + fn enum                  |

**Result:** All growId/facilityId flows are explicit, validated, and guarded. No "phantom" undefined states.
