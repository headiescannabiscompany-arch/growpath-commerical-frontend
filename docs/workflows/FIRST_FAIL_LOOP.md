# First-Fail Loop (Deterministic Fix Workflow)

Rules:
- Fix only the first failing suite/test.
- Do not refactor unrelated code.
- After the fix, rerun the same command. Repeat.

Commands:
- Jest acceptance: `node ./node_modules/jest/bin/jest.js --config ./jest.config.cjs --runInBand`
- Single file: `node ./node_modules/jest/bin/jest.js --config ./jest.config.cjs --runInBand <path-to-test>`

Checklist per failure:
1. Confirm failure is reproducible (rerun once).
2. Patch minimal surface area to fix the failure.
3. Rerun the same command.
4. Commit with message: `fix(test): <suite> <short cause>`
