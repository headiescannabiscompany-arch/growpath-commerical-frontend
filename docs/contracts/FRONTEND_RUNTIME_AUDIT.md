# Frontend Runtime Audit

This audit is the source-of-truth check for frontend runtime shape.

## Contract

- `docs/contracts/FRONTEND_RUNTIME_CONTRACT.json`
  - Personal visible tabs and hidden tabs
  - Required personal routes
  - Legacy route redirect assertions
  - Tool safety assertions (NPK preview labeling)
  - Required capability keys

## Commands

- `npm run inventory:ui-routes`
  - Writes `tmp/spec/ui-routes.json`
- `npm run inventory:tool-surface`
  - Writes `tmp/spec/tool-surface.json`
- `npm run inventory:capabilities`
  - Writes `tmp/spec/capability-keys.json`
- `npm run validate:frontend-runtime-contract`
  - Validates repo state against `FRONTEND_RUNTIME_CONTRACT.json`

## CI recommendation

Run in this order:

1. `npm run inventory:ui-routes`
2. `npm run inventory:tool-surface`
3. `npm run inventory:capabilities`
4. `npm run validate:frontend-runtime-contract`
