# Frontend Build Gates

**Purpose**: Define what "builds successfully" means for GrowPath frontend
**Authority**: All gates must pass before any commit is merged to `main`
**Status**: Active enforcement (Phase 1+)

---

## 🚦 THE 5 GATES (ALL MUST PASS)

### Gate 1: TypeScript Compilation ✅

**Command**:

```bash
npx tsc --noEmit
```

**Expected Result**: `✓ 0 errors`

**PASS Criteria**:

- Exit code 0
- No TypeScript errors in any file
- All imports resolve correctly
- All types are valid

**FAIL Criteria**:

- Any TypeScript error exists
- Exit code non-zero
- Any `// @ts-ignore` added (workarounds not allowed)
- Any `any` types introduced without justification

**Verification**:

```bash
cd c:\growpath-commercial\frontend
npx tsc --noEmit
# Look for: "Found 0 errors"
```

**Enforcement**: CI/CD must run this check on every PR.

---

### Gate 2: Expo Starts Without Errors ✅

**Command**:

```bash
npx expo start --web --clear
```

**Expected Result**:

- Metro bundler starts successfully
- Bundle completes without errors
- Browser loads at `http://localhost:8081` (or configured port)
- No red error screen on initial load
- Console shows "Compiled successfully" or equivalent

**PASS Criteria**:

- Expo starts without crashing
- Browser displays app (even if login screen)
- No red error overlay
- Metro shows "Bundled successfully"

**FAIL Criteria**:

- Expo exits with code 1
- "Cannot find module" errors
- Red error screen on load
- Metro bundler crashes
- Infinite reload loop

**Verification**:

```bash
cd c:\growpath-commercial\frontend
npx expo start --web --clear

# Wait 30-60 seconds for bundle
# Open browser: http://localhost:8081
# Check for red screens or console errors
```

**Enforcement**: Manual verification required before merging.

---

### Gate 3: Navigation Resolves ✅

**Command**: Manual testing

**Expected Result**:

- App loads to login screen (if not authenticated)
- Login succeeds → redirects to home screen
- Navigation stack exists (back button works)
- No "undefined route" errors in console
- All defined routes resolve to screens (not blank)

**PASS Criteria**:

- Login → Home flow works
- Back button functions correctly
- No navigation errors in console
- Routes resolve predictably

**FAIL Criteria**:

- Navigation throws runtime errors
- Routes resolve to blank screens (unintentional)
- Back button crashes app
- Console shows navigation warnings/errors
- Undefined route errors

**Verification**:

```
1. Start Expo Web
2. Open http://localhost:8081
3. Login with test credentials
4. Verify redirect to home
5. Navigate to another tab/screen
6. Press back button
7. Check console for errors
```

**Enforcement**: QA checklist before merge.

---

### Gate 4: No Runtime Crashes on Boot ✅

**Command**: Visual inspection + console monitoring

**Expected Result**:

- App loads without crashing
- No unhandled promise rejections
- No "Cannot read property X of undefined" errors
- ErrorBoundary does NOT trigger on initial load
- Clean console (no red errors)

**PASS Criteria**:

- App renders successfully
- Console shows no errors
- No white screen of death
- ErrorBoundary not triggered

**FAIL Criteria**:

- App crashes before login screen
- Console shows unhandled errors
- White/blank screen with no UI
- ErrorBoundary catches boot errors

**Verification**:

```
1. Kill all node processes
2. Start fresh: npx expo start --web --clear
3. Open browser with DevTools
4. Watch console during initial load
5. Confirm: no red errors, no crashes
```

**Enforcement**: Manual verification required.

---

### Gate 5: ESLint (If Enabled) ✅

**Command**:

```bash
npx eslint . --ext .ts,.tsx,.js,.jsx
```

**Expected Result**: No **fatal** errors

**PASS Criteria**:

- Exit code 0 (warnings are acceptable)
- No error-level lint failures
- No syntax errors detected

**FAIL Criteria**:

- Any error-level lint failures
- Syntax errors detected by ESLint
- Exit code non-zero

**Verification**:

```bash
cd c:\growpath-commercial\frontend
npx eslint . --ext .ts,.tsx,.js,.jsx
# Warnings OK, errors FAIL
```

**Enforcement**: CI/CD recommended (but warnings allowed during Phase 1).

---

## 📋 GATE VERIFICATION CHECKLIST

**Run this before every commit to `main`**:

```bash
# Gate 1: TypeScript
npx tsc --noEmit
# Expected: "Found 0 errors"

# Gate 2: Expo Start
npx expo start --web --clear
# Expected: Bundled successfully, no red screens

# Gate 3: Navigation (manual)
# 1. Login
# 2. Navigate
# 3. Back button
# 4. Check console

# Gate 4: Runtime (manual)
# 1. Fresh start
# 2. Watch console
# 3. No errors on boot

# Gate 5: ESLint
npx eslint . --ext .ts,.tsx,.js,.jsx
# Expected: Exit code 0 (warnings OK)
```

**All 5 gates MUST pass.**

---

## 🚨 ENFORCEMENT RULES

### Pre-Commit (Local)

- Developer runs Gate 1 (TypeScript) before committing
- Developer verifies Gate 2 (Expo starts) before pushing

### Pre-Merge (CI/CD)

- CI runs Gate 1 (TypeScript) automatically
- CI runs Gate 5 (ESLint) automatically
- Manual QA verifies Gates 2, 3, 4 before merge approval

### Post-Merge (Main Branch)

- Main branch should ALWAYS pass all 5 gates
- If main branch fails any gate, **stop all work** and fix immediately

---

## 🛑 WHAT TO DO IF A GATE FAILS

### If TypeScript fails:

1. Read the error message carefully
2. Fix the specific error (no `// @ts-ignore` workarounds)
3. Re-run `npx tsc --noEmit`
4. Repeat until 0 errors

### If Expo Start fails:

1. Check for syntax errors
2. Check for missing dependencies (`npm install`)
3. Clear cache: `npx expo start --web --clear`
4. Check import paths (case sensitivity on Windows)

### If Navigation fails:

1. Check route definitions
2. Verify screen components exist
3. Check for circular dependencies
4. Review navigation logs in console

### If Runtime crashes:

1. Check console for stack trace
2. Identify failing component/hook
3. Add null checks / error boundaries
4. Test fresh boot after fix

### If ESLint fails:

1. Run `npx eslint . --fix` to auto-fix
2. Manually fix remaining errors
3. Re-run ESLint to verify

---

## 📊 GATE STATUS MATRIX

| Gate | Command                | Pass Criteria   | Current Status       |
| ---- | ---------------------- | --------------- | -------------------- |
| 1    | `npx tsc --noEmit`     | 0 errors        | 🔴 FAILING (Phase 0) |
| 2    | `npx expo start --web` | Loads clean     | 🔴 FAILING (Phase 0) |
| 3    | Manual navigation test | Login→Home→Back | 🔴 FAILING (Phase 0) |
| 4    | Console monitoring     | No boot crashes | 🔴 FAILING (Phase 0) |
| 5    | `npx eslint .`         | No fatal errors | ⚠️ UNKNOWN           |

**Goal**: All gates 🟢 PASSING by end of Phase 1.

---

## 🎯 PHASE 1 TARGET

**Phase 1 is COMPLETE when**:

- Gate 1: 🟢 PASSING (0 TypeScript errors)
- Gate 2: 🟢 PASSING (Expo starts clean)
- Gate 3: 🟢 PASSING (Navigation works)
- Gate 4: 🟢 PASSING (No boot crashes)
- Gate 5: 🟢 PASSING (ESLint clean)

**This document defines the finish line.**

---

**Status**: 🔴 All gates currently failing (pre-Phase 1)
**Target**: 🟢 All gates passing (post-Phase 1)
**Last Updated**: February 7, 2026
**Authority**: No exceptions to gate requirements
