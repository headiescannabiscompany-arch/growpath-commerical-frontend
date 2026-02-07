# Phase 1 Frontend Recovery — Acceptance Checklist

**Purpose**: Define "done" for frontend infrastructure recovery
**Scope**: Phase 1 only (build correctness, not features)
**Status**: Pre-execution contract
**Decision Authority**: Binary pass/fail (no interpretation)

---

## ✅ PASS/FAIL GATES (ALL MUST PASS)

### Gate 1: TypeScript Compilation

```bash
npx tsc --noEmit
```

**Expected Result**: `✓ 0 errors`

**FAIL if**:

- Any TypeScript errors exist
- Any `// @ts-ignore` comments added during Phase 1
- Any `any` types introduced during Phase 1

**Verification**: Run command, count errors, must be zero.

---

### Gate 2: Expo Starts Without Errors

```bash
npx expo start --web --clear
```

**Expected Result**:

- Metro bundler starts
- No red error screen
- Browser loads at `http://localhost:8081`
- Console shows "Compiled successfully" or similar

**FAIL if**:

- Red error screen appears
- "Cannot find module" errors
- "undefined is not an object" on boot
- Bundler crashes or exits with code 1

**Verification**: Start Expo, open browser, check for red screens.

---

### Gate 3: Navigation Resolves

**Expected Result**:

- App loads to login screen (if not authenticated)
- Login succeeds → redirects to home
- Navigation stack exists (back button works where expected)
- No "undefined route" errors in console

**FAIL if**:

- Navigation throws runtime errors
- Routes resolve to blank screens (unless intentional stub)
- Back button crashes app
- Browser console shows navigation warnings

**Verification**: Manual test of login → home → navigate → back.

---

### Gate 4: No Runtime Crashes on Boot

**Expected Result**:

- App loads without crashing
- No unhandled promise rejections
- No "Cannot read property of undefined" errors
- ErrorBoundary does not trigger on initial load

**FAIL if**:

- App crashes before reaching login screen
- Console shows unhandled errors
- White screen of death

**Verification**: Open app fresh, watch console, confirm no errors.

---

### Gate 5: ESLint (If Enabled)

```bash
npx eslint . --ext .ts,.tsx,.js,.jsx
```

**Expected Result**: No **fatal** errors

**Warnings are acceptable** during Phase 1.

**FAIL if**:

- Any error-level lint failures
- Syntax errors detected by ESLint

**Verification**: Run ESLint, check exit code (0 = pass).

---

## 🏗️ INFRASTRUCTURE REQUIREMENTS (MUST EXIST)

### Requirement 1: Auth Context

**Must exist**:

- `AuthContext` or `AuthProvider` (read-only is acceptable)
- Exposes `token`, `user`, `isAuthenticated` (or equivalents)
- Hydrates on app load (AsyncStorage or similar)

**Must NOT**:

- Crash if token is missing
- Block app indefinitely
- Depend on unimplemented backend routes

**Verification**: Check `src/auth/` or equivalent, confirm exports.

---

### Requirement 2: Facility Selection

**Must exist**:

- Facility context or provider
- Method to select facility (dropdown, picker, or stub)
- Facility ID accessible in downstream screens

**Must NOT**:

- Require complex multi-facility logic (defer to Phase 2+)
- Block UI if facilities unavailable

**Verification**: Check facility provider, confirm selection mechanism.

---

### Requirement 3: Error Boundary

**Must exist**:

- Top-level ErrorBoundary wrapping app
- Catches unhandled errors gracefully
- Shows fallback UI (not blank screen)

**Must NOT**:

- Crash silently
- Hide all errors (dev mode should log)

**Verification**: Check `App.tsx` or `_layout.tsx` for ErrorBoundary.

---

### Requirement 4: Loading States

**Must exist**:

- Loading spinner/skeleton during auth hydration
- Loading state for facility selection

**Must NOT**:

- Show blank white screen during load
- Block indefinitely if data unavailable

**Verification**: Open app fresh, confirm spinner shows before login.

---

### Requirement 5: Minimal Navigation Shell

**Must exist**:

```
App.tsx
  └─ AuthGate (login vs authenticated)
      └─ FacilityGate (facility selection vs tabs)
          └─ TabNavigator
              ├─ Home (stub ok)
              ├─ Profile (stub ok)
              └─ (other stubs as needed)
```

**Must NOT**:

- Include dead routes (routes that go nowhere)
- Include feature screens (grows, logs, tools) unless required for nav structure

**Verification**: Trace navigation tree, confirm minimal structure.

---

## 🚫 EXPLICIT NON-GOALS (MUST NOT EXIST)

### Non-Goal 1: Feature Work

**Phase 1 does NOT include**:

- Implementing new features
- Refactoring feature screens (unless blocking build)
- Adding AI tools, grows tracking, logs, etc.

**Acceptable**: Stubbing features to unblock navigation.

**FAIL if**: New feature logic added during Phase 1.

---

### Non-Goal 2: UI/UX Improvements

**Phase 1 does NOT include**:

- Design updates
- Styling improvements
- Accessibility enhancements

**Acceptable**: Minimal styling to prevent blank screens.

**FAIL if**: Significant UI/UX work added during Phase 1.

---

### Non-Goal 3: Backend Integration

**Phase 1 does NOT include**:

- Wiring new backend routes
- Updating API contracts
- Implementing backend features

**Acceptable**: Maintaining existing auth/health check integrations.

**FAIL if**: New backend integrations added during Phase 1.

---

### Non-Goal 4: Test Suite Expansion

**Phase 1 does NOT include**:

- Writing new unit tests
- Writing new E2E tests
- Expanding test coverage

**Acceptable**: Fixing broken tests that block builds.

**FAIL if**: Test suite expanded significantly during Phase 1.

---

## 📋 DEPENDENCY SANITY CHECKS

### Check 1: No Circular Dependencies

**Tool**:

```bash
npx madge --circular --extensions ts,tsx,js,jsx src/
```

**Expected Result**: `✓ No circular dependencies found`

**FAIL if**: Circular dependencies exist (unless pre-existing and documented).

**Verification**: Run madge, check for cycles.

---

### Check 2: No Dead Imports

**Expected Result**:

- All imports resolve
- No imports from deleted files
- No unused imports (warnings acceptable)

**FAIL if**:

- TypeScript shows "Cannot find module" for local imports
- Build fails due to missing imports

**Verification**: TypeScript compilation will catch this (Gate 1).

---

### Check 3: tsconfig.json Is Valid

**Expected Result**:

- `tsconfig.json` parses correctly
- Includes/excludes are sane
- No conflicting compiler options

**FAIL if**:

- `npx tsc --showConfig` fails
- Compiler options cause unexpected behavior

**Verification**: Run `npx tsc --showConfig`, confirm no errors.

---

## 📄 DOCUMENTATION REQUIREMENTS

### Requirement 1: FRONTEND_BUILD_GATES.md

**Must exist**: Document defining what "builds successfully" means.

**Contents**:

- Gate conditions (TypeScript, Expo, Runtime, Navigation, ESLint)
- Commands to verify each gate
- Expected results

**FAIL if**: Document missing or incomplete.

---

### Requirement 2: Navigation Structure Documented

**Must exist**: Clear description of navigation tree.

**Format**: Text, diagram, or comment in code.

**Contents**:

- Root navigator
- Auth flow
- Tab structure
- Stub screens (if any)

**FAIL if**: Navigation structure is unclear or undocumented.

---

## 🎯 FINAL SIGN-OFF CRITERIA

**Phase 1 is COMPLETE only when ALL of the following are TRUE**:

- [ ] **Gate 1**: `npx tsc --noEmit` returns 0 errors
- [ ] **Gate 2**: `npx expo start --web` loads without red screen
- [ ] **Gate 3**: Navigation resolves (login → home → back works)
- [ ] **Gate 4**: No runtime crashes on boot (console clean)
- [ ] **Gate 5**: ESLint shows no fatal errors (if enabled)
- [ ] **Infrastructure**: Auth, Facility, ErrorBoundary, Loading states exist
- [ ] **Navigation**: Minimal shell exists (no dead routes)
- [ ] **Non-Goals**: No feature work, UI improvements, backend integration added
- [ ] **Dependencies**: No circular deps, no dead imports
- [ ] **Docs**: `FRONTEND_BUILD_GATES.md` exists and accurate

**All checkboxes must be checked. No exceptions.**

---

## 🚨 SCOPE PROTECTION

**If during Phase 1 someone requests**:

- "Can we also add [feature]?"
- "Let's improve the [UI] while we're here"
- "This is a good time to [refactor]"

**Answer**: "That's Phase 2+ work. Let's finish Phase 1 first."

**Rationale**: Scope creep kills recovery efforts. Phase 1 is **correctness only**.

---

## ✅ VERIFICATION PROCEDURE

**To verify Phase 1 completion**:

1. Clone repo fresh (or `git pull`)
2. `npm install` (or `yarn install`)
3. `npx tsc --noEmit` → confirm 0 errors
4. `npx expo start --web --clear` → confirm loads
5. Open browser → `http://localhost:8081` → confirm no red screen
6. Login → navigate → back → confirm works
7. Check console → confirm no errors
8. Run ESLint → confirm no fatal errors
9. Check docs → confirm `FRONTEND_BUILD_GATES.md` exists
10. Review non-goals → confirm no feature work added

**If all steps pass: ✅ Phase 1 COMPLETE**

**If any step fails: 🔴 Phase 1 INCOMPLETE**

---

## 📊 ACCEPTANCE MATRIX

| Gate               | Command                | Expected                  | Actual | Status |
| ------------------ | ---------------------- | ------------------------- | ------ | ------ |
| TypeScript         | `npx tsc --noEmit`     | 0 errors                  | **\_** | ⬜     |
| Expo Start         | `npx expo start --web` | Loads clean               | **\_** | ⬜     |
| Navigation         | Manual test            | Login→Home→Back           | **\_** | ⬜     |
| Runtime            | Browser console        | No crashes                | **\_** | ⬜     |
| ESLint             | `npx eslint .`         | No fatal errors           | **\_** | ⬜     |
| Auth Context       | Code review            | Exists                    | **\_** | ⬜     |
| Facility Selection | Code review            | Exists                    | **\_** | ⬜     |
| Error Boundary     | Code review            | Exists                    | **\_** | ⬜     |
| Loading States     | Code review            | Exists                    | **\_** | ⬜     |
| Navigation Shell   | Code review            | Minimal structure         | **\_** | ⬜     |
| No Feature Work    | Code review            | None added                | **\_** | ⬜     |
| No Circular Deps   | `npx madge --circular` | None found                | **\_** | ⬜     |
| Docs Exist         | File check             | `FRONTEND_BUILD_GATES.md` | **\_** | ⬜     |

**Sign-off**: Phase 1 complete when all Status = ✅

---

**Status**: 📋 Pre-execution contract (awaiting Phase 1 start)
**Created**: February 7, 2026
**Authority**: Binary pass/fail (no interpretation or negotiation)
