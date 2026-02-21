# Overnight Batch

node .\scripts\full-scan.mjs
rg -n "fetch\(|axios|/:\\w+" src > .\tmp\drift_scan.txt
npm run lint 2>&1 | Tee-Object .\tmp\lint_night.txt
npm test -- --runInBand --forceExit 2>&1 | Tee-Object .\tmp\test_night.txt
