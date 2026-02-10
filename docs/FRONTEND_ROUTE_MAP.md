# FRONTEND_ROUTE_MAP

Purpose: Make GrowPath’s Expo Router frontend “3D printable” — every screen has a known path, a known job, a known hook set, and a known navigation pattern. This prevents Metro melt-downs (double default exports, imports after code, mixed navigation APIs).

## Non-Negotiable Build Rules

- One file = one screen
- Every route file exports exactly one `export default function ScreenName() { ... }`
- No second screen pasted at bottom.
- No export default inside helper blocks.
- Imports are only at the top
- Absolutely no import ... after any code.
- If Metro says Identifier 'React' has already been declared, it’s almost always because a second import block exists mid-file.
- Expo Router navigation only
- Use expo-router (useRouter, router.push, router.back)
- Do not use navigation.navigate props inside router screens.
- Tabs are for top-level views only
- A tab screen should render: a list overview, a dashboard, or a “safe mount stub”
- Any “drill in / detail” belongs in the stack routes (non-tab paths).

## Folder Structure Contract

Expo Router uses filesystem routing. This is the canonical layout for Facility mode:

```
src/app/
  _layout.tsx                 (root stack)
  index.tsx                   (bootstrap gate)

  (auth)/
    _layout.tsx               (auth stack)
    login.tsx                 (login)

  home/
    _layout.tsx               (home stack)
    index.tsx                 (mode picker)

    facility/
      _layout.tsx             (facility stack; gates facility selection)
      select.tsx              (select facility)

      (tabs)/
        _layout.tsx           (facility tabs)
        dashboard.tsx
        grows.tsx
        plants.tsx
        tasks.tsx
        logs.tsx
        inventory.tsx
        team.tsx
        profile.tsx
        audit-logs.tsx        (tab = overview OR stub; no details here)
        sop-runs.tsx          (tab = overview OR stub; no details here)

      audit-logs/
        index.tsx             (real list + filters)
        [id].tsx              (detail)

      sop-runs/
        index.tsx             (real list)
        [id].tsx              (run detail)
        presets.tsx           (presets list screen)
```

## Route Map

- `/` → src/app/index.tsx
- `/(auth)/login` → src/app/(auth)/login.tsx
- `/home` → src/app/home/index.tsx
- `/home/facility` → src/app/home/facility/(tabs)/dashboard (after gating)
- `/home/facility/select` → src/app/home/facility/select.tsx
- `/home/facility/(tabs)/dashboard` ... `/home/facility/(tabs)/sop-runs`
- `/home/facility/audit-logs` → list
- `/home/facility/audit-logs/:id` → detail
- `/home/facility/sop-runs` → list
- `/home/facility/sop-runs/:id` → detail
- `/home/facility/sop-runs/presets` → presets list

## Navigation Contract

- Tab → drill-in: useRouter, router.push
- Never use navigation.navigate or React Navigation stacks inside route files
- Tabs are stable, simple, predictable; drill-in screens don’t pollute tab files

## API + Error Handling Contract

- Canonical imports: apiRequest, endpoints, useApiErrorHandler, InlineError
- Canonical request pattern: see docs/FRONTEND_SCREEN_CONTRACT.md

## Verification Checklist

- Exactly one export default function per file
- All imports at file top
- No duplicate import React
- Uses useRouter (not navigation props)
- If facility screen: gates on facilityId
- Errors: useApiErrorHandler + InlineError
- Tab screens do not contain detail logic
