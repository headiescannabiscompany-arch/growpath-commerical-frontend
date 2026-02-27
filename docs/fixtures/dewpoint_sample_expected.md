# Dew Point Guard CSV Fixture Expected Results

Fixture file: `docs/fixtures/dewpoint_sample.csv`

```json
{
  "mapping": {
    "tsCol": 0,
    "tempCol": 1,
    "rhCol": 2,
    "tempUnit": "F"
  },
  "assumedLeafAirDeltaF": 1.0,
  "marginCThreshold": 0.5,
  "summary": {
    "riskBand": "high",
    "timeAtRiskMinutes": 20,
    "minCondensationMarginC": -0.2363538983
  },
  "tolerances": {
    "timeAtRiskMinutes": 0,
    "minCondensationMarginC": 0.05
  }
}
```

## Import setup
- Source type: `manual` or `upload` (not `pulse`)
- Column mapping:
  - timestamp -> `timestamp`
  - temperature -> `temp_f`
  - RH -> `rh`
- Temperature unit: `F`
- Assumed leaf cooler than air: default `1.0 F`
- Margin threshold: default `0.5 C` (tool internal)

## Expected ingest behavior
- Parsed rows: `6`
- Valid converted points sent to backend: `6`
- Timestamp normalization: values already include `Z`, so no timezone rewrite
- Row-cap behavior: no clipping (fixture is below cap)

## Expected risk summary (source mode)
- `riskBand`: `high`
- `pointsAnalyzed`: `6`
- `timeAtRiskMinutes`: `20`
- `maxRh`: `98`

## Numeric tolerance checks
- `maxDewPointF`: about `66.3 F` (allow +/-`0.3 F`)
- `minAirTempF`: `63.0 F` (allow +/-`0.1 F`)
- `minCondensationMarginF`: about `-0.43 F` (allow +/-`0.2 F`)

If these checks fail, verify:
- mapping is correct (`temp_f` was selected)
- temperature unit is `F`
- source mode fetched the same window that includes all 6 rows
