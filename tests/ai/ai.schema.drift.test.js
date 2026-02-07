// ---------- helpers ----------
function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function listJsonFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => path.join(dir, f));
}

function makeAjv() {
  const ajv = new Ajv({
    allErrors: true,
    strict: true,
    allowUnionTypes: true
  });
  addFormats(ajv);
  return ajv;
}

function expectValid(validate, data, label = "payload") {
  const ok = validate(data);
  if (!ok) {
    const msg =
      `${label} failed schema validation:\n` +
      (validate.errors || []).map((e) => `- ${e.instancePath} ${e.message}`).join("\n");
    throw new Error(msg);
  }
}

function isoNow() {
  return new Date().toISOString();
}

function baseTimestamps() {
  return {
    createdAt: isoNow(),
    updatedAt: isoNow(),
    deletedAt: null
  };
}

function baseIds(extra = {}) {
  return {
    id: "uuid_x",
    ...extra
  };
}

// ---------- locate schemas ----------
/**
 * Put schemas at:
 *   <repoRoot>/schemas/schemas/...
 *
 * Expected structure from zip extract:
 *   schemas/schemas/common.json
 *   schemas/schemas/objects/*.json
 *   schemas/schemas/requests/*.json
 *   schemas/schemas/responses/*.json
 */
const repoRoot = path.resolve(__dirname, "..", "..");
const schemasRoot = path.join(repoRoot, "schemas");

const objectsDir = path.join(schemasRoot, "schemas", "objects");
const requestsDir = path.join(schemasRoot, "schemas", "requests");
const responsesDir = path.join(schemasRoot, "schemas", "responses");
const commonPath = path.join(schemasRoot, "schemas", "common.json");

function ensureSchemaPathsExist() {
  const missing = [];
  if (!fs.existsSync(schemasRoot)) missing.push("schemas/");
  if (!fs.existsSync(path.join(schemasRoot, "schemas"))) missing.push("schemas/schemas/");
  if (!fs.existsSync(commonPath)) missing.push("schemas/schemas/common.json");
  if (!fs.existsSync(objectsDir)) missing.push("schemas/schemas/objects/");
  if (!fs.existsSync(requestsDir)) missing.push("schemas/schemas/requests/");
  if (!fs.existsSync(responsesDir)) missing.push("schemas/schemas/responses/");
  if (missing.length) {
    throw new Error(
      "Schema directories/files not found:\n" +
        missing.map((m) => `- ${m}`).join("\n") +
        "\n\nExtract the zip schema pack into <repoRoot>/schemas/\n" +
        "Expected: <repoRoot>/schemas/schemas/objects/*.json etc."
    );
  }
}

// ---------- tests ----------
describe("AI Schema Drift Stopper (V1.0.1)", () => {
  let ajv;

  beforeAll(() => {
    ensureSchemaPathsExist();
    ajv = makeAjv();
  });

  test("Schema folders exist", () => {
    expect(fs.existsSync(commonPath)).toBe(true);
    expect(fs.existsSync(objectsDir)).toBe(true);
    expect(fs.existsSync(requestsDir)).toBe(true);
    expect(fs.existsSync(responsesDir)).toBe(true);
  });

  test("All schema JSON files parse", () => {
    const files = [
      commonPath,
      ...listJsonFiles(objectsDir),
      ...listJsonFiles(requestsDir),
      ...listJsonFiles(responsesDir)
    ];
    for (const file of files) {
      expect(() => readJson(file)).not.toThrow();
    }
  });

  test("AiCallRequest schema exists", () => {
    const p = path.join(requestsDir, "AiCallRequest.json");
    expect(fs.existsSync(p)).toBe(true);
  });

  test("Envelope schemas exist", () => {
    expect(fs.existsSync(path.join(responsesDir, "ApiSuccessEnvelope.json"))).toBe(true);
    expect(fs.existsSync(path.join(responsesDir, "ApiErrorEnvelope.json"))).toBe(true);
  });

  // ---- request contract ----
  describe("Request: AiCallRequest", () => {
    let validate;

    beforeAll(() => {
      const schema = readJson(path.join(requestsDir, "AiCallRequest.json"));
      validate = ajv.compile(schema);
    });

    test("Accepts a canonical request", () => {
      const req = {
        tool: "harvest",
        fn: "harvest.analyzeTrichomes",
        args: { images: ["https://example.com/a.jpg"], zones: ["top"], notes: "macro" },
        context: {
          facilityId: "fac_123",
          growId: "grow_123",
          stage: "flower",
          goal: "balanced",
          date: isoNow()
        }
      };
      expectValid(validate, req, "AiCallRequest");
    });

    test("Rejects unknown tool", () => {
      const req = {
        tool: "unknown",
        fn: "x.y",
        args: {},
        context: { facilityId: "fac_1", growId: "g_1", stage: "veg", date: isoNow() }
      };
      const ok = validate(req);
      expect(ok).toBe(false);
    });

    test("Rejects missing context", () => {
      const req = { tool: "harvest", fn: "harvest.analyzeTrichomes", args: {} };
      const ok = validate(req);
      expect(ok).toBe(false);
    });
  });

  // ---- envelope contract ----
  describe("Envelopes", () => {
    let validateOk;
    let validateErr;

    beforeAll(() => {
      validateOk = ajv.compile(
        readJson(path.join(responsesDir, "ApiSuccessEnvelope.json"))
      );
      validateErr = ajv.compile(
        readJson(path.join(responsesDir, "ApiErrorEnvelope.json"))
      );
    });

    test("Valid success envelope", () => {
      const res = { success: true, data: { result: {} }, error: null };
      expectValid(validateOk, res, "ApiSuccessEnvelope");
    });

    test("Valid error envelope", () => {
      const res = {
        success: false,
        data: null,
        error: { code: "CONFIDENCE_TOO_LOW", message: "Need clearer images" }
      };
      expectValid(validateErr, res, "ApiErrorEnvelope");
    });

    test("Rejects success envelope with non-null error", () => {
      const res = { success: true, data: {}, error: { code: "X", message: "bad" } };
      const ok = validateOk(res);
      expect(ok).toBe(false);
    });
  });

  // ---- objects contract ----
  describe("Stored Objects", () => {
    const objectSchemas = listJsonFiles(objectsDir);

    test("Has at least 20 stored object schemas", () => {
      expect(objectSchemas.length).toBeGreaterThanOrEqual(20);
    });

    test("All stored object schemas compile in Ajv", () => {
      for (const file of objectSchemas) {
        const schema = readJson(file);
        expect(() => ajv.compile(schema)).not.toThrow();
      }
    });

    // Representative "happy path" samples to catch enum/range drift
    // (We don't attempt to generate a perfect sample for every object automatically.)
    const samples = [
      {
        name: "TrichomeAnalysis",
        file: "TrichomeAnalysis.json",
        sample: {
          ...baseIds({ facilityId: "fac_1", growId: "g_1" }),
          images: ["https://example.com/a.jpg"],
          zones: ["top"],
          distribution: { clear: 0.2, cloudy: 0.7, amber: 0.1 },
          confidence: 0.75,
          notes: "top is mostly cloudy",
          ...baseTimestamps()
        }
      },
      {
        name: "HarvestDecision",
        file: "HarvestDecision.json",
        sample: {
          ...baseIds({ facilityId: "fac_1", growId: "g_1" }),
          window: { min: isoNow(), ideal: isoNow(), max: isoNow() },
          recommendation: "WAIT_3_5_DAYS",
          partialHarvest: false,
          confidence: 0.7,
          ...baseTimestamps()
        }
      },
      {
        name: "Task",
        file: "Task.json",
        sample: {
          ...baseIds({ facilityId: "fac_1", growId: "g_1" }),
          title: "Check runoff EC",
          priority: "high",
          status: "open",
          dueAt: isoNow(),
          ...baseTimestamps()
        }
      },
      {
        name: "Alert",
        file: "Alert.json",
        sample: {
          ...baseIds({ facilityId: "fac_1", growId: "g_1" }),
          type: "BUD_ROT_RISK",
          riskLevel: "high",
          message: "High dew point + dense canopy late flower",
          ...baseTimestamps()
        }
      },
      {
        name: "EventLog",
        file: "EventLog.json",
        sample: {
          ...baseIds({ facilityId: "fac_1", growId: "g_1" }),
          type: "WATERING_EVENT",
          payload: { inEC: 1.8, outEC: 2.3 },
          ...baseTimestamps()
        }
      }
    ];

    for (const s of samples) {
      test(`${s.name} sample validates`, () => {
        const validate = ajv.compile(readJson(path.join(objectsDir, s.file)));
        expectValid(validate, s.sample, s.name);
      });
    }

    test("Enum enforcement example: Task.priority rejects invalid value", () => {
      const validate = ajv.compile(readJson(path.join(objectsDir, "Task.json")));
      const bad = {
        ...baseIds({ facilityId: "fac_1", growId: "g_1" }),
        title: "Bad enum",
        priority: "urgent", // invalid
        status: "open",
        dueAt: isoNow(),
        ...baseTimestamps()
      };
      const ok = validate(bad);
      expect(ok).toBe(false);
    });

    test("Range enforcement example: confidence cannot exceed 1.0", () => {
      const validate = ajv.compile(
        readJson(path.join(objectsDir, "TrichomeAnalysis.json"))
      );
      const bad = {
        ...baseIds({ facilityId: "fac_1", growId: "g_1" }),
        images: ["https://example.com/a.jpg"],
        zones: ["top"],
        distribution: { clear: 0.3, cloudy: 0.6, amber: 0.1 },
        confidence: 1.5, // invalid
        notes: "nope",
        ...baseTimestamps()
      };
      const ok = validate(bad);
      expect(ok).toBe(false);
    });
  });
});
