import {
  normalizeDeviationsSummary,
  normalizeSopsRecommended
} from "../complianceDashboardApi";

function baseDeviationsPayload() {
  return {
    facilityId: "FAC_A",
    window: "4w",
    generatedAt: "2026-02-08T12:00:00.000Z",
    recurringDeviations: [
      {
        code: "EC_DRIFT",
        label: "EC drift",
        count: -5, // should sanitize to 0
        lastSeenAt: "2026-02-07T00:00:00.000Z",
        severity: "SEVERE" // invalid -> LOW
      }
    ],
    openDeviations: [
      {
        id: "DEV_2",
        code: "TEMP_HIGH",
        label: "High temp",
        openedAt: "2026-02-08T00:00:00.000Z",
        severity: "HIGH"
      },
      {
        id: "DEV_1",
        code: "TEMP_HIGH",
        label: "High temp",
        openedAt: "2026-02-01T00:00:00.000Z",
        severity: "HIGH"
      }
    ]
  };
}

function baseSopsPayload() {
  return {
    facilityId: "FAC_A",
    window: "4w",
    generatedAt: "2026-02-08T12:00:00.000Z",
    recommendedSops: [
      { sopId: "SOP_2", title: "Dry Room Airflow", reason: "Because" },
      { sopId: "SOP_1", title: "Clone Hygiene", reason: "Because" }
    ]
  };
}

describe("complianceDashboardApi normalizers", () => {
  test("Deviations summary sanitizes severity + count and never throws on missing fields", () => {
    const facilityFallback = "FAC_FALLBACK";
    const raw = {
      // facilityId intentionally omitted to verify fallback
      recurringDeviations: [
        {
          code: "X",
          count: NaN,
          lastSeenAt: "2026-02-01T00:00:00.000Z",
          severity: "NOPE"
        },
        { code: "Y", count: -1, lastSeenAt: "2026-02-02T00:00:00.000Z", severity: "MED" }
      ]
      // openDeviations missing -> must normalize deterministically (should be [])
    };
    const norm = normalizeDeviationsSummary(raw, facilityFallback);
    expect(norm.facilityId).toBe(facilityFallback);
    expect(Array.isArray(norm.recurringDeviations)).toBe(true);
    expect(Array.isArray(norm.openDeviations)).toBe(true);
    expect(norm.recurringDeviations[0]).toEqual({
      code: "X",
      label: "X",
      count: 0,
      lastSeenAt: "2026-02-01T00:00:00.000Z",
      severity: "LOW"
    });
    expect(norm.recurringDeviations[1]).toEqual({
      code: "Y",
      label: "Y",
      count: 0,
      lastSeenAt: "2026-02-02T00:00:00.000Z",
      severity: "MED"
    });
    expect(norm.openDeviations).toEqual([]);
  });

  test("Envelope unwrapping: raw, {data}, {ok:true,data} normalize identically (deviations)", () => {
    const payload = baseDeviationsPayload();
    const facilityId = "FAC_OVERRIDE";
    const rawA = payload;
    const rawB = { data: payload };
    const rawC = { ok: true, data: payload };
    const normA = normalizeDeviationsSummary(rawA, facilityId);
    const normB = normalizeDeviationsSummary(rawB, facilityId);
    const normC = normalizeDeviationsSummary(rawC, facilityId);
    expect(normA).toEqual(normB);
    expect(normA).toEqual(normC);
    expect(normA.recurringDeviations[0].severity).toBe("LOW");
    expect(normA.recurringDeviations[0].count).toBe(0);
  });

  test("Envelope unwrapping: raw, {data}, {ok:true,data} normalize identically (sops)", () => {
    const payload = baseSopsPayload();
    const facilityId = "FAC_OVERRIDE";
    const rawA = payload;
    const rawB = { data: payload };
    const rawC = { ok: true, data: payload };
    const normA = normalizeSopsRecommended(rawA, facilityId);
    const normB = normalizeSopsRecommended(rawB, facilityId);
    const normC = normalizeSopsRecommended(rawC, facilityId);
    expect(normA).toEqual(normB);
    expect(normA).toEqual(normC);
    expect(Array.isArray(normA.recommendedSops)).toBe(true);
  });

  test("normalizeSopsRecommended returns empty array for missing input", () => {
    const normSops = normalizeSopsRecommended({});
    expect(normSops.recommendedSops).toEqual([]);
  });
});
