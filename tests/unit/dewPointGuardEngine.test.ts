import {
  mapCsvToPoints,
  normalizeTelemetryTimestamp,
  parseCsvText,
  suggestedTelemetryMapping
} from "@/features/personal/tools/dewPointGuard/engine";

describe("telemetry CSV parsing", () => {
  const acInfinityFixture = [
    '"Device ID","Test Controller","",""',
    '"Export Time","07/15/2026 12:35:43\u202fAM","",""',
    '"Sample Frequency","24 HRS","",""',
    '"Start Time","03/14/2026 1:28:00\u202fAM","",""',
    '"End Time","07/15/2026 12:33:00\u202fAM","",""',
    '"Temperature Units","°F","",""',
    '"Time","CO₂ (Sensor 1)","Inside Temperature","Inside Relative Humidity","Inside VPD","Outside Temperature","Outside Relative Humidity"',
    '"","","","","","",""',
    '"03/18/2026 1:28\u202fAM","606.00","64.70","41.20","1.22","69.90","30.60"',
    '"03/19/2026 1:28\u202fAM","620.00","65.10","42.00","1.20","70.10","31.20"'
  ].join("\n");

  it("detects AC Infinity metadata and maps the inside environment channel", () => {
    const parsed = parseCsvText(acInfinityFixture);
    const mapping = suggestedTelemetryMapping(parsed);

    expect(parsed.provider).toBe("ac_infinity");
    expect(parsed.headerRowIndex).toBe(6);
    expect(parsed.metadata).toEqual(
      expect.objectContaining({
        "Sample Frequency": "24 HRS",
        "Temperature Units": "°F"
      })
    );
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.warnings?.[0]).toMatch(/one sample per day/i);
    expect(mapping).toEqual({
      tsCol: 0,
      tempCol: 2,
      rhCol: 3,
      tempUnit: "F",
      vpdCol: 4,
      co2Col: 1,
      lightCol: undefined,
      lightKind: undefined
    });
  });

  it("normalizes AC Infinity wall-clock timestamps using the grow timezone", () => {
    expect(
      normalizeTelemetryTimestamp("03/18/2026 1:28\u202fAM", "America/New_York")
    ).toBe("2026-03-18T05:28:00.000Z");
    expect(normalizeTelemetryTimestamp("2026-11-18T01:28:00", "America/New_York")).toBe(
      "2026-11-18T06:28:00.000Z"
    );
  });

  it("converts only complete mapped rows and preserves chronological order", () => {
    const parsed = parseCsvText(acInfinityFixture);
    const mapping = suggestedTelemetryMapping(parsed);
    expect(mapping).not.toBeNull();
    const points = mapCsvToPoints(parsed, mapping!, {
      normalizeTimestamp: (value) =>
        normalizeTelemetryTimestamp(value, "America/New_York")
    });

    expect(points).toHaveLength(2);
    expect(points[0]).toEqual(
      expect.objectContaining({
        ts: "2026-03-18T05:28:00.000Z",
        rh: 41.2,
        vpdKpa: 1.22,
        co2Ppm: 606
      })
    );
    expect(points[0].airTempC).toBeCloseTo(18.17, 2);
  });
});
