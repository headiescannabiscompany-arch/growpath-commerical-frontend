# AI Feature Catalog — Mechanical Architecture

## Overview

The "buttons/features attached to AI" are now built from a **single source of truth**: the feature matrix. Adding a new AI tool requires only:

1. Add entry to `AI_FEATURES` in `aiFeatureMatrix.ts`
2. Create a detail screen component (copy-paste from ComputeVPDScreen)
3. Add `<AIStack.Screen>` in `AIToolsNavigator` (copy-paste pattern)
4. Implement backend endpoint (if persistence)

That's it. No tab bloat, no navigation hell, no hardcoded growIds.

---

## File Structure

```
src/features/ai/
├── aiFeatureMatrix.ts          ← Single source of truth (catalog)
└── components/
    └── AIResultCard.tsx        ← Standard result renderer (all tools use this)

src/screens/facility/
├── AIToolsHomeScreen.tsx       ← Card list (reads matrix, renders cards)
├── HarvestWindowScreen.tsx     ← Detail: Harvest window form
├── TrichomeAnalysisScreen.tsx  ← Detail: Trichome analysis
├── ComputeVPDScreen.tsx        ← Detail: VPD metric (Phase 1.1)
└── ECRecommendScreen.tsx       ← Detail: EC recommendation (Phase 1.1)

src/navigation/
└── FacilityTabs.js             ← AIToolsNavigator (stack routing + param plumbing)
```

---

## The Catalog: aiFeatureMatrix.ts

```typescript
export const AI_FEATURES: AIFeature[] = [
  {
    id: "harvest-window",
    label: "Estimate Harvest Window",
    description: "Calculate harvest dates from trichome distribution",
    tool: "harvest",
    fn: "estimateHarvestWindow",
    enabled: true, // ← flip to false to disable
    ui: "form", // form | metric | wizard
    screen: "HarvestWindow", // route name in AIStack
    requires: { facilityId: true, growId: true }, // context check
    writes: ["HarvestDecision", "CalendarEvent"] // audit trail
  }
  // ... more tools
];
```

**Key props:**

- `enabled`: Controls shipping toggle. Disabled tools show "Coming Soon" in cards.
- `screen`: Route name in AIStack.Navigator — must match <AIStack.Screen name="...">
- `requires.facilityId/growId`: UI blocks if context missing
- `writes`: Informs AIResultCard what to expect in response

---

## The Home Screen: AIToolsHomeScreen.tsx

```tsx
{
  AI_FEATURES.map((feature) => (
    <ToolCard
      key={feature.id}
      feature={feature}
      facilityId={facilityId}
      growId={growId}
      onNavigate={onNavigate}
    />
  ));
}
```

That's it. All cards are generated from the matrix. When you add a new row:

1. ✅ Card appears automatically
2. ✅ Enabled/disabled state controlled by matrix
3. ✅ Context checks (facilityId, growId) enforced
4. ✅ "Coming Soon" badge if disabled

---

## Detail Screens: Pattern

Every detail screen follows this shape:

```tsx
export default function MyToolScreen({
  facilityId,
  growId // only if requires.growId = true
}: {
  facilityId: string;
  growId?: string;
}) {
  const { callAI, loading, error, last } = useAICall(facilityId);

  const onRun = async () => {
    await callAI({
      tool: "...",
      fn: "...",
      args: {
        /* form inputs */
      },
      context: { growId } // if needed
    });
  };

  return (
    <>
      <View>{/* form inputs */}</View>
      <Pressable onPress={onRun}>
        <Text>Run</Text>
      </Pressable>
      {error && <Text>{error.message}</Text>}
      <AIResultCard data={last?.data} />
    </>
  );
}
```

**Copy this pattern, swap tool/fn/args, done.**

---

## Navigation: AIToolsNavigator

```tsx
<AIStack.Navigator>
  <AIStack.Screen
    name="AIToolsHome"
    component={(navProps) => (
      <AIToolsHomeScreen
        facilityId={facility.selectedId}
        growId={navProps.route?.params?.growId || ""}
        onNavigate={(screen, params) => navProps.navigation.navigate(screen, params)}
      />
    )}
  />

  <AIStack.Screen
    name="HarvestWindow"
    component={(navProps) => (
      <HarvestWindowScreen
        facilityId={navProps.route.params?.facilityId}
        growId={navProps.route.params?.growId}
      />
    )}
  />

  {/* When you add a new tool, copy-paste this pattern: */}
  <AIStack.Screen
    name="ComputeVPD"
    component={(navProps) => (
      <ComputeVPDScreen facilityId={navProps.route.params?.facilityId} />
    )}
  />
</AIStack.Navigator>
```

**Rule: screen name must match `feature.screen` in matrix.**

---

## Adding a New AI Tool (Step-by-Step)

### 1. Add to Matrix

In `aiFeatureMatrix.ts`:

```typescript
{
  id: "my-new-tool",
  label: "My New Tool",
  description: "...",
  tool: "climate",
  fn: "myNewFunction",
  enabled: false,  // start disabled, flip to true when ready
  ui: "form",
  screen: "MyNewTool",  // matches stack.Screen name
  requires: { facilityId: true, growId: false },
  writes: ["Task"]  // if persistence
}
```

### 2. Create Detail Screen

Copy `ComputeVPDScreen.tsx` (or `ECRecommendScreen.tsx`), rename, update tool/fn:

```tsx
// src/screens/facility/MyNewToolScreen.tsx
export default function MyNewToolScreen({ facilityId }: { facilityId: string }) {
  const { callAI, loading, error, last } = useAICall(facilityId);
  const [input, setInput] = useState("");

  const onRun = async () => {
    await callAI({
      tool: "climate", // from matrix.tool
      fn: "myNewFunction", // from matrix.fn
      args: { input },
      context: {}
    });
  };

  return (
    <>
      <TextInput value={input} onChangeText={setInput} />
      <Pressable onPress={onRun}>
        <Text>Run</Text>
      </Pressable>
      {error && <Text>{error.message}</Text>}
      <AIResultCard data={last?.data} />
    </>
  );
}
```

### 3. Mount in Navigator

In `FacilityTabs.js`, add to `AIStack.Navigator`:

```tsx
<AIStack.Screen
  name="MyNewTool"
  options={{ title: "My New Tool" }}
  component={(navProps) => (
    <MyNewToolScreen facilityId={navProps.route.params?.facilityId || ""} />
  )}
/>
```

### 4. Import at Top

```tsx
import MyNewToolScreen from "../screens/facility/MyNewToolScreen";
```

### 5. Done

- ✅ Card appears in AI Tools home (with "Coming Soon")
- ✅ Flip `enabled: true` in matrix → card becomes interactive
- ✅ Tapping card navigates to MyNewToolScreen
- ✅ Results render in AIResultCard

---

## Result Rendering: AIResultCard

```tsx
<AIResultCard
  title="My Result"
  data={last?.data} // expects { result, confidence, writes }
/>
```

Handles:

- Confidence score + reason
- Result pretty-print (JSON)
- Writes audit trail (type + id of persisted records)

No custom UI per tool — standardized card for all.

---

## 409 Confirmation Gate (Phase 1.1+)

When backend returns 409 USER_CONFIRMATION_REQUIRED:

Current implementation (ECRecommendScreen):

```tsx
const needsConfirm =
  last?.success === false && last?.error?.code === "USER_CONFIRMATION_REQUIRED";

if (needsConfirm) {
  return <Text>Confirm required: {last?.error?.message}</Text>;
}
```

Next phase: add modal + re-call with `args.confirm=true`:

```tsx
const onConfirm = async () => {
  await callAI({
    ...lastRequest,
    args: { ...lastRequest.args, confirm: true }
  });
};
```

---

## Phase 1.1 Disabled Features (Already Wired)

These tools are defined in the matrix, their screens exist, but are disabled by default:

- **climate.computeVPD**: Read-only metric, no persistence
- **ec.recommendCorrection**: First 409 confirmation gate example

Flip `enabled: true` when you want to ship them. Cards appear automatically.

---

## Contract Guarantees

**Envelope Shape (All AI Calls)**

```typescript
{
  success: boolean,
  data: {
    result: any,
    confidence?: number,
    confidence_reason?: string,
    recommendation?: string,
    writes?: [{ type, id }, ...] // if persistence
  } | null,
  error: { code, message } | null
}
```

**AIResultCard Expectations**

```typescript
{
  result: any,
  confidence?: number,
  confidence_reason?: string,
  recommendation?: string,
  writes?: [{ type, id }, ...]
}
```

If your tool returns these fields in `data.result` or top-level `data`, AIResultCard renders them.

---

## What Stays Constant (No Regressions)

- ✅ FacilityStack.js untouched (no deep nav flows)
- ✅ Back button works (native stack nav)
- ✅ facilityId from useFacility() (no route params guessing)
- ✅ growId passed consistently (AIToolsHome → detail screens)
- ✅ Error handling standardized (useAICall envelope)
- ✅ Result display reused (AIResultCard)

---

## Checklist: Copy-Paste Safe

When adding a new tool:

- [ ] Add entry to `AI_FEATURES` (id, enabled: false, requires, screen)
- [ ] Create detail screen (copy ComputeVPD pattern, swap tool/fn)
- [ ] Add to FacilityTabs imports
- [ ] Add `<AIStack.Screen>` in AIToolsNavigator (copy pattern)
- [ ] Test: card appears with "Coming Soon"
- [ ] Flip `enabled: true` in matrix
- [ ] Test: card is interactive, navigates, loads screen
- [ ] Implement 409 gate if applicable

Done. No other files touched.
