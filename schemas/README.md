# GrowPath JSON Schemas (V1.0.1)

These schemas are contract-lock "drift stoppers" for:

- Stored objects (`schemas/objects/*.json`)
- AI call request (`schemas/requests/AiCallRequest.json`)
- Response envelopes (`schemas/responses/*.json`)
- Shared enums/defs (`schemas/common.json`)

## Where to put them

Extract the schema zip into the repo root like this:

```
<repoRoot>/
└── schemas/
    └── schemas/
        ├── common.json
        ├── objects/
        │   ├── TrichomeAnalysis.json
        │   ├── HarvestDecision.json
        │   ├── Task.json
        │   ├── Alert.json
        │   ├── EventLog.json
        │   └── ... (25 total)
        ├── requests/
        │   └── AiCallRequest.json
        └── responses/
            ├── ApiSuccessEnvelope.json
            └── ApiErrorEnvelope.json
```

## Validate in Jest

```bash
npm test -- tests/ai/ai.schema.drift.test.js
```

## Ajv usage (manual)

```bash
npm i -D ajv ajv-formats
```

```javascript
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const schema = require("./schemas/schemas/objects/TrichomeAnalysis.json");
const validate = ajv.compile(schema);

const ok = validate({
  /* object */
});
if (!ok) console.log(validate.errors);
```

## Important note

Cross-field constraints like "trichome distribution sums to ~1.0" are enforced in code/tests, not JSON Schema (unless you add a custom keyword).
