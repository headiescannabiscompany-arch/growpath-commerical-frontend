# Frontend Tool Save/Open Migration Checklist

This checklist tracks migration to the canonical one-click journal flow:

- Save tool run
- Normalize tool run id
- Open `/home/personal/logs/new` with `growId` + `toolRunId`
- Enforce via `saveToolRunAndOpenJournal`

Canonical helper:

- `src/features/personal/tools/saveToolRunAndOpenJournal.ts`

Guard:

- `scripts/guard-tool-journal-flow.cjs`
- Blocks direct `logs/new` and `toolRunId=` literals inside personal tool route files.

## Migrated (Complete)

- `src/app/home/personal/(tabs)/tools/vpd.tsx`
- `src/app/home/personal/(tabs)/tools/watering.tsx`
- `src/app/home/personal/(tabs)/tools/npk.tsx`
- `src/app/home/personal/(tabs)/tools/dew-point-guard.tsx`
- `src/app/home/personal/(tabs)/tools/ppfd.tsx`
- `src/app/home/personal/(tabs)/tools/bud-rot-risk.tsx`
- `src/app/home/personal/(tabs)/tools/crop-steering.tsx`

## Planned Tool Routes (Create + Migrate)

- `src/app/home/personal/(tabs)/tools/fert-recipe.tsx`
- `src/app/home/personal/(tabs)/tools/ec-drift.tsx`
- `src/app/home/personal/(tabs)/tools/soil-builder.tsx`
- `src/app/home/personal/(tabs)/tools/topdress.tsx`
- `src/app/home/personal/(tabs)/tools/harvest-readiness.tsx`
- `src/app/home/personal/(tabs)/tools/diagnose-ai.tsx`
- `src/app/home/personal/(tabs)/tools/pheno-matrix.tsx`
- `src/app/home/personal/(tabs)/tools/run-compare.tsx`
- `src/app/home/personal/(tabs)/tools/auto-calendar.tsx`
- `src/app/home/personal/(tabs)/tools/daily-task-generator.tsx`

## Migration Pattern

1. Import helper:
`import { saveToolRunAndOpenJournal } from "@/features/personal/tools/saveToolRunAndOpenJournal";`

2. Add local state:
`const [savingAndOpening, setSavingAndOpening] = useState(false);`

3. Save/open handler:
- set `savingAndOpening = true`
- call helper with `router`, `growId`, `toolType`, `input`, `output`
- show feedback if `result.ok === false`
- set `savingAndOpening = false`

4. UI hardening:
- disable action button while saving
- show `"Saving..."` label during in-flight

5. Keep plain `Save run` as separate action where useful.

## Verification Commands

- `node scripts/guard-tool-journal-flow.cjs`
- `node scripts/inventory-ui-routes.cjs`
- `node scripts/validate-frontend-runtime-contract.cjs`
