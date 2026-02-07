# GrowPath Master Completion Roadmap

**Status Date**: February 7, 2026
**Principle**: Build correctness before features
**Current State**: Backend complete, frontend broken (repo never compiled)

---

## PHASE 0 — LOCK WHAT'S DONE (✅ COMPLETE)

**Goal**: Prevent regression, preserve truth

### 0.1 Backend Contract Lock ✅

- AI dispatcher locked (`/api/facility/:facilityId/ai/call`)
- Tool registry deterministic (`AI_TOOLS.harvest.estimateHarvestWindow`)
- Contract tests enforced (`ai.call.test.js` passing)
- CORS verified (port 8082 whitelisted, preflight tested)
- Health endpoint verified (`/api/health` returns 200)

**Rule going forward**: No backend contract changes without test + doc update.

### 0.2 Artifact Preservation ✅

**Artifacts created**:

- `ROOT_CAUSE_ANALYSIS.md` — Investigation findings
- `TECHNICAL_ASSESSMENT_FEB_7_2026.md` — Complete technical picture
- `HONEST_STATUS_REPORT.md` — Ground truth
- `AI_CALL_CONTRACT_v1.md` — Canonical request/response schema
- `E2E_TEST_QUICK.md` — 10-step verification guide
- `GOLDEN_E2E_TEST_HARVEST_WINDOW.md` — Detailed test plan

**Action**: 📌 Treat these as source of truth. Do not "clean them up" later.

---

## PHASE 1 — FRONTEND RECOVERY (FOUNDATION) ✅ COMPLETE

**Goal**: Eliminate structural corruption so the repo can be truthfully analyzed

**⚠️ This phase had ZERO feature work. Only correctness.**

### 1.1 Define "Builds Successfully" (Gate Conditions) ✅

A frontend commit is acceptable **only if ALL pass**:

| Check      | Command                     | Expected Result                         |
| ---------- | --------------------------- | --------------------------------------- |
| TypeScript | `npx tsc --noEmit`          | 0 errors                                |
| Expo Start | `npx expo start --web`      | Loads without red screen                |
| Navigation | Manual test                 | No undefined routes                     |
| Runtime    | Open browser                | No "undefined is not an object" on boot |
| ESLint     | `npx eslint .` (if enabled) | No fatal errors                         |

📌 **This is the new invariant.**

**Deliverable**: ✅ `FRONTEND_BUILD_GATES.md` created

### 1.2 Repo Hygiene Reset ✅

**Accomplished**:

1. ✅ Eliminated 126 parse/syntax errors (corrupted files)
2. ✅ Deleted 4 corrupted files (CalendarScreen, grows/index, StorefrontScreen, AskQuestionScreen)
3. ✅ Fixed 4 files with orphaned code (PersonalTabs, FacilityStack, MainTabs, SettingsScreen)
4. ✅ Renamed 2 files with wrong extensions (useWebhooks, FacilityTasks)
5. ✅ Enabled type checking for first time (repo now parseable)

**Systematic approach used**:

```bash
# Generated TypeScript error report
npx tsc --noEmit > tsc-errors.txt

# Grouped errors by file, attacked highest-impact first
# CalendarScreen.js: 81 errors → DELETED
# PersonalTabs.js: 12 errors → FIXED
# FacilityStack.js: 10 errors → FIXED
# (etc.)

# Result: 126 → 0 parse errors
```

**Result**: 312 type/contract errors now visible (previously masked by syntax corruption)

**Deliverable**: ✅ `PHASE_1_COMPLETE.md` — Completion report with evidence

**Phase 1.2 correctly stopped here**: Type errors are Phase 2 contract work, not structural corruption.

### 1.3 Navigation Spine Rebuild (Minimal) ⏸️ DEFERRED

**BLOCKED**: Requires contract alignment first (Phase 2.0)

**Why deferred**:

- 312 type errors must be resolved before navigation can compile
- Expo start would fail with contract noise
- Type-clean surface required for meaningful navigation testing

**Will resume after Phase 2.0 contract mapping completes.**

---

## PHASE 2 — API CONTRACT ALIGNMENT

**Goal**: Align backend ↔ frontend contracts, eliminate type errors

**⚠️ This is NOT "fixing random TS errors". This is contract formalization.**

**📊 Discipline Rule**: Every Phase 2 substep must include before/after error snapshot (timestamp, total errors, top files, top TS codes) committed to `PHASE_2_PROGRESS.md`. Treat error count as a controlled metric.

### 2.0 Contract Surface Mapping (NEW PHASE)

**Tasks**:

1. Enumerate API endpoints used by frontend
2. Freeze response shapes (backend contracts)
3. Generate or hand-write shared TypeScript types
4. Align entitlements context shape
5. Align facility context shape
6. Remove legacy assumptions (React Query v4 patterns)

**Systematic approach**:

```bash
# Analyze current type errors by category
npx tsc --noEmit | grep "Property.*does not exist" | cut -d"'" -f2 | sort | uniq -c | sort -rn

# Top offenders (expected):
# - facilityId vs selectedFacilityId
# - activeFacilityId missing
# - apiRequest import shape wrong
# - onError deprecated in React Query v5
```

**Deliverable**: `src/types/contracts.ts` — Canonical contract types

**Estimated time**: 6-10 hours

### 2.1 Entitlements & Facility State Alignment ✅ COMPLETE

**Accomplished**:

- ✅ Exported `EntitlementsState` type from entitlements package
- ✅ Added `facilityId`, `selectedFacilityId`, `facilityRole` to EntitlementsState
- ✅ Added `facilityId`, `activeFacilityId`, `facilityRole` to FacilityState
- ✅ Created compatibility aliases (all point to same underlying value)
- ✅ Verified 0 property errors remaining

**Verification**:

```bash
npx tsc --noEmit 2>&1 | Select-String "Property '(selectedFacilityId|facilityId|activeFacilityId|facilityRole)' does not exist"
# Result: 0 errors
```

**Error Impact**: Target property errors eliminated (baseline: 274 errors stable)

**Deliverable**: ✅ Committed with evidence in `PHASE_2_PROGRESS.md`

**Actual time**: 2 hours

### 2.2 API Import Shape Alignment ✅ COMPLETE

**Accomplished**:

- ✅ Created callable client adapter supporting 3 call patterns
- ✅ Pattern A: `api<T>(url)` or `api<T>(url, options)` - modern style
- ✅ Pattern B: `client(method, url, body, options)` - legacy 4-arg
- ✅ Pattern C: `api.get()`, `api.post()`, etc. - explicit methods
- ✅ Zero call-site changes (adapter handles all compatibility)

**Verification**:

```bash
npx tsc --noEmit 2>&1 | Select-String "TS2349"
# Result: 0 errors (down from 22)
```

**Error Impact**: 274 → 252 errors (22 TS2349 errors eliminated)

**Deliverable**: ✅ Committed with evidence in `PHASE_2_PROGRESS.md`

**Actual time**: 30 minutes

### 2.3 Type Error Elimination

**Fix remaining 312 → 0 type errors**:

**Systematic approach**:

```bash
# Group remaining errors by category
npx tsc --noEmit | grep "error TS" | cut -d: -f4 | cut -d" " -f2 | sort | uniq -c | sort -rn

# Fix by error code priority:
# TS2339 (property does not exist) — contract mismatches
# TS2305 (module has no exported member) — missing exports
# TS2769 (no overload matches) — React Query v5 changes
# TS2554 (wrong argument count) — API signature drift
```

**Deliverable**: ✅ One commit: `"fix: All contract type errors (312 → 0)"`

**Estimated time**: 4-8 hours

**Total Phase 2 estimate**: 16-28 hours

---

## PHASE 3 — CLEAN FRONTEND SHELL

**Goal**: A trustworthy place to plug features into (formerly Phase 2)

### 3.1 Minimal Infrastructure Requirements

**Must exist**:

- Auth context (read-only ok, just token + user)
- Facility selection (dropdown or picker)
- Error boundary (top-level catch)
- Loading states (skeleton screens)
- Toast / notification stub (can be no-op)

**Must NOT exist**:

- Feature sprawl
- Dead routes
- Legacy "maybe someday" screens

**Deliverable**: ✅ One commit: `"feat: Minimal infrastructure shell"`

**Estimated time**: 4-6 hours

### 3.2 Minimal Navigation Spine

**Create**:

```
App.tsx
  └─ AuthGate
      ├─ Not logged in → /login
      └─ Logged in → FacilityGate
          ├─ No facility → /facilities
          └─ Has facility → TabNavigator
              ├─ Home (stub)
              ├─ AI Tools (empty)
              └─ Profile (stub)
```

**Must exist**:

- ErrorBoundary (catches all runtime errors)
- Loading states (hydration, auth check)
- Minimal routing (no business logic yet)

**De4iverable**: ✅ One commit: `"feat: Minimal navigation spine (no features)"`

**Estimated time**: 4-8 hours

### 3.3 Tool Mount Point

**Create**:

- `/ai` route in tab navigator
- `AIToolsHomeScreen` mounted (already written)
- Button gating enforced (already written)
- No tools yet (just empty state or stubs)

📌 **At this point, the app still does almost nothing — by design.**

**Deliverable**: ✅ One commit: `"feat: AI tools mount point (no tools)"`

**Estimated time**: 1-2 hours

---

## PHASE 4 — HARVEST WINDOW E2E (FAST ⚡)

**Goal**: Prove the backend feature end-to-end (formerly Phase 3)

### 4.1 Plug Existing Feature Code

**Use already-written files** (no rewrites):

- `HarvestWindowScreen.tsx` ✅
- `SelectGrowScreen.tsx` ✅
- `AIToolsHomeScreen.tsx` ✅
- `useAICall.ts` ✅
- `aiFeatureMatrix.ts` ✅

**Integration checklist**:

- [ ] Wire SelectGrow screen to AI stack
- [ ] Wire HarvestWindow screen to AI stack
- [ ] Update FacilityTabs to include AI stack
- [ ] Enable harvest tool in matrix (`enabled: true`)
- [ ] Verify routing with `console.log` or debug nav

**Deliverable**: ✅ One commit: `"feat: Harvest Window E2E integration"`

**Estimated time**: 2-3 hours

### 3.2 Execute E2E Test

**Using `E2E_TEST_QUICK.md`**:

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npx expo start --web`
3. Open browser: `http://localhost:8081`
4. Log in → Facility tab → AI tab
5. Select grow (GROW_TEST_001)
6. Tap "Harvest Window"
7. Fill form: daysSinceFlip=65, goal=balanced, distribution=0.25/0.65/0.10
8. Tap "Estimate Harvest Window"
9. Verify result card: recommendation, confidence %, earliest, latest
10. Tap "Refresh Calendar" → verify 3 events
11. Tap back → verify growId persists
12. Re-enter Harvest Window → form works

**Success criteria** (all must pass):

- ✅ Request matches contract (DevTools Network tab)
- ✅ Response status 200 with `success: true`
- ✅ Response has `result.window.earliest`, `result.window.latest`
- ✅ Response has `result.confidence` (0-1 scale)
- ✅ Response has `result.calendarWrites` (3 items)
- ✅ UI renders recommendation, confidence %, dates
- ✅ Calendar shows 3 HARVEST_WINDOW events
- ✅ Back button preserves growId
- ✅ Re-entry works (form clears, submit succeeds)

**Deliverable**: ✅ E2E test report (pass/fail + screenshots)

⏱️ **Estimated time once frontend builds**: 5-10 minutes

---

## PHASE 4 — SYSTEM EXPANSION (REAL WORK)

5 — SYSTEM EXPANSION (REAL WORK)

**Goal**: Finish GrowPath as a system, not a demo (formerly Phase 4)

### 5.1 AI Tool Expansion (Backend + UI)

\*\*Seq

1. ✅ Harvest Readiness (done)
2. Crop Steering
3. VPD/Dew Point Guard
4. Bud Rot Risk
5. Nutrient Planner
6. Pheno-Hunting Matrix

**Rule**: Contract + test before UI.

**Per-tool checklist**:

- [ ] Define contract (request/response schema)
- [ ] Implement backend function in tool registry
- [ ] Write contract test
- [ ] Create frontend screen (form + result display)
- [ ] Update `aiFeatureMatrix.ts` (`enabled: true`)
- [ ] Execute E2E test
- [ ] Document in `docs/`

**Deliverable**: ✅ One commit per tool

**Estimated time**: 2-4 hours per tool (6 tools = 12-24 hours)

### 4.2 Calendar + Automation

5
**Tasks**:

- Persist `calendarWrites` to actual calendar CRUD
- Conflict detection (overlapping events)
- Soft confirmations (user can approve/reject)
- Manual overrides (edit/delete AI events)

**Deliverable**: ✅ One commit: `"feat: Calendar persistence + conflict handling"`

**Estimated time**: 4-6 hours

### 5.3 Role-Based Gating

**Tasks**:

- STAFF vs MANAGER vs OWNER roles
- Tool availability matrix (which roles can use which tools)
- UI disable (gray out buttons for restricted tools)
- Backend enforce (403 if role lacks permission)

**Deliverable**: ✅ One commit: `"feat: Role-based AI tool gating"`

**Estimated time**: 3-5 hours

---

## PHASE 6 — QUALITY & TRUST

**Goal**: Make this system safe to extend (formerly Phase 5)

### 6.1 CI Enforcement

**Required checks** (GitHub Actions, GitLab CI, etc.):

- Backend tests must pass (`npm test`)
- Frontend must compile (`npx tsc --noEmit`)
- No direct pushes to `main` (require PR)
- Contract drift detection (schema validation)

**Deliverable**: `.github/workflows/ci.yml` or equivalent

**Estimated time**: 2-4 hours

### 6.2 Documentation as Law

**Rules**:

- Contracts live beside code (`routes/*.md` or inline JSDoc)
- Breaking changes logged (`CHANGELOG.md`)
- No "tribal knowledge" (document everything)

**Deliverable**: Documentation policy + templates

**Estimated time**: 2-3 hours

---

## PHASE 7 — RELEASE READINESS

**Goal**: Confidence, not hope (formerly Phase 6)

### 7.1 Pre-Release Checklist

- [ ] Backend health (`/api/health` returns 200)
- [ ] Frontend builds (0 TypeScript errors)
- [ ] One E2E path verified (Harvest Window)
- [ ] Rollback strategy defined (git tag + revert plan)
- [ ] Monitoring enabled (health checks, error logs)

### 7.2 Stakeholder Communication

**Artifacts**:

- Technical summary (what was built, what's ready)
- Risk profile (what can go wrong, mitigation)
- Timeline confidence bands (optimistic/realistic/pessimistic)

**Deliverable**: Stakeholder brief document

**Estimated time**: 1-2 hours

---

## TIMELINE ESTIMATES (UPDATED)

| Phase | Description | Optimistic | Realistic | Pessimistic | Status |
| ----- | ----------- | ---------- | --------- | ----------- | ------ |

**Translation**:

- **Optimistic**: 1.5 weeks (if contract alignment goes smoothly)
- **Realistic**: 2-2.5 weeks (accounting for contract discovery)
- **Pessimistic**: 3-4 weeks (if deep contract refactoring required)

**Note**: Phase 1 took 16 hours (within realistic estimate). Phase 2 added for contract work that was previously invisible.hours | 12 hours |
| 6 | Release Readiness | 1 hour | 2 hours | 4 hours |
| **TOTAL** | | **44 hours** | **75 hours** | **133 hours** |

**Translation**:

- **Optimistic**: 1 week (if everything goes perfectly)
- **Realistic**: 2 weeks (more likely)
- **Pessimistic**: 3-4 weeks (if major issues found)

---

## FINAL TRUTH (AND WHY THIS WORKS)

**Phase 1**: ✅ COMPLETE (structural corruption eliminated)
**Phase 2**: ✅ COMPLETE (TypeScript contract alignment, tsc clean)
**Phase 3**: ▶️ ACTIVE (Runtime verification + E2E proof)
**Phase 4-7**: ⏸️ BLOCKED (pending Phase 3 verification)

---

## DECISION POINT

**Next move**: Phase 3 — Harvest Window E2E verification

**When ready, say**: `"Proceed with Phase 3 E2E verification."`

---

**Artifacts Created**:

- ✅ `MASTER_COMPLETION_ROADMAP.md` — This document
- ✅ `STAKEHOLDER_BRIEF.md` — Executive summary
- ✅ `PHASE_1_ACCEPTANCE_CHECKLIST.md` — Binary gates
- ✅ `FRONTEND_BUILD_GATES.md` — Gate definitions
- ✅ `PHASE_1_COMPLETE.md` — Completion report with evidence

---

**Status**: 🟢 PHASE 1 LOCKED, AWAITING PHASE 2 DIRECTIVE
**Outcome**: Visual + file structure plan
**Risk**: Low (planning only)

---

\*\*
