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

  it.each([
    ["tempC", "C", 25, 0],
    ["temp_c", "C", 25, 0],
    ["Air Temperature (°C)", "C", 25, 0],
    ["temperature [Celsius]", "C", 25, 0],
    ["temp℃", "C", 25, 0],
    ["tempF", "F", 77, 32],
    ["temp_f", "F", 77, 32],
    ["temperature °F", "F", 77, 32],
    ["Air Temperature (Fahrenheit)", "F", 77, 32]
  ])("reads explicit temperature units from the %s header", (header, unit, warm, cold) => {
    const parsed = parseCsvText(
      [
        `timestamp,${header},rh`,
        `2026-01-01T00:00:00Z,${warm},55`,
        `2026-01-01T01:00:00Z,${cold},60`
      ].join("\n")
    );
    const mapping = suggestedTelemetryMapping(parsed);
    expect(mapping).toMatchObject({ tempCol: 1, tempUnit: unit });
    expect(mapCsvToPoints(parsed, mapping!).map((point) => point.airTempC)).toEqual([25, 0]);
  });

  it.each([
    ["°F", "tempC", 77],
    ["°C", "tempF", 25]
  ])("prefers explicit export metadata %s over a conflicting header", (unit, header, warm) => {
    const parsed = parseCsvText(
      [
        `Temperature Units,${unit}`,
        `Time,${header},Humidity`,
        `2026-01-01T00:00:00Z,${warm},55`
      ].join("\n")
    );
    const mapping = suggestedTelemetryMapping(parsed);
    expect(mapping?.tempUnit).toBe(unit === "°C" ? "C" : "F");
    expect(mapCsvToPoints(parsed, mapping!)[0].airTempC).toBe(25);
  });

  it.each([
    ["unknown", "tempC", "C"],
    ["unspecified", "temperature", "F"],
    ["", "temperature °C", "C"]
  ])("ignores unrecognized export metadata %s for %s", (units, header, expectedUnit) => {
    const parsed = parseCsvText(
      [
        `Temperature Units,${units}`,
        `Time,${header},Humidity`,
        "2026-01-01T00:00:00Z,25,55"
      ].join("\n")
    );
    expect(suggestedTelemetryMapping(parsed)?.tempUnit).toBe(expectedUnit);
  });

  it("keeps the existing default for ambiguous labels and honors a manual correction", () => {
    const parsed = parseCsvText(
      "Time,temperature (C/F),rh\n2026-01-01T00:00:00Z,25,55"
    );
    const mapping = suggestedTelemetryMapping(parsed);
    expect(mapping?.tempUnit).toBe("F");
    expect(mapCsvToPoints(parsed, { ...mapping!, tempUnit: "C" })[0].airTempC).toBe(25);
  });

  it("takes units from the chosen temperature channel and ignores other headers", () => {
    const parsed = parseCsvText(
      "Time,outside temperature (°C),inside temperature,rh\n2026-01-01T00:00:00Z,2,77,55"
    );
    const mapping = suggestedTelemetryMapping(parsed);
    expect(mapping).toMatchObject({ tempCol: 2, tempUnit: "F" });
    expect(mapCsvToPoints(parsed, mapping!)[0].airTempC).toBe(25);
  });

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
      luxCol: undefined,
      ppfdCol: undefined,
      dliCol: undefined,
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

  it("keeps a non-lux LIGHT column unmapped until the setup meaning is reviewed", () => {
    const parsed = parseCsvText(
      [
        '"Device ID","Test Controller"',
        '"Temperature Units","°F"',
        '"Time","LIGHT (Sensor 1)","Inside Temperature","Inside Relative Humidity"',
        '"03/18/2026 1:28 AM","2.5","64.7","41.2"'
      ].join("\n")
    );
    const suggested = suggestedTelemetryMapping(parsed);

    expect(suggested).toEqual(
      expect.objectContaining({ lightCol: 1, lightKind: "unmapped" })
    );
    const points = mapCsvToPoints(parsed, {
      ...suggested!,
      lightKind: "controller_state"
    });
    expect(points[0]).toEqual(
      expect.objectContaining({
        lightValue: 2.5,
        lightUnit: "controller_reported_lighting_state",
        lightLux: null
      })
    );
  });

  it("imports simultaneous measured lux, PPFD, and DLI without relabeling them", () => {
    const parsed = parseCsvText(
      [
        '"Time","Illuminance","PPFD","Daily Light Integral","Inside Temperature","Inside Relative Humidity"',
        '"2026-08-25T12:00:00.000Z","18000","420","23.4","75","55"'
      ].join("\n")
    );
    const suggested = suggestedTelemetryMapping(parsed);
    expect(suggested).toEqual(
      expect.objectContaining({
        luxCol: 1,
        ppfdCol: 2,
        dliCol: 3,
        lightCol: undefined,
        lightKind: undefined
      })
    );
    const [point] = mapCsvToPoints(parsed, suggested!);
    expect(point).toEqual(
      expect.objectContaining({
        lightLux: 18000,
        ppfd: 420,
        dliMolM2Day: 23.4,
        lightValue: null
      })
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

  it("skips rows whose mapped inside temperature or RH cell is blank", () => {
    const parsed = parseCsvText(
      [
        '"Device ID","Test Controller"',
        '"Temperature Units","°F"',
        '"Time","Inside Temperature","Inside Relative Humidity","Outside Temperature","Outside Relative Humidity"',
        '"03/17/2026 1:28 AM","","","69.4","44.6"',
        '"03/18/2026 1:28 AM","64.7","41.2","69.9","30.6"'
      ].join("\n")
    );
    const mapping = suggestedTelemetryMapping(parsed);
    expect(mapping).not.toBeNull();

    const points = mapCsvToPoints(parsed, mapping!, {
      normalizeTimestamp: (value) =>
        normalizeTelemetryTimestamp(value, "America/New_York")
    });

    expect(points).toHaveLength(1);
    expect(points[0]).toEqual(
      expect.objectContaining({
        ts: "2026-03-18T05:28:00.000Z",
        rh: 41.2
      })
    );
  });
});
