import {
  isoInstantToZonedLocalDateTime,
  zonedLocalDateTimeToIsoStrict,
  ZonedDateTimeError
} from "@/features/businessDesk/zonedDateTime";

describe("Business Desk zoned date-time helpers", () => {
  it("round-trips one instant through a workspace zone independent of device locale", () => {
    const instant = "2026-08-22T16:30:00.000Z";
    const wall = isoInstantToZonedLocalDateTime(instant, "America/Los_Angeles");
    expect(wall).toBe("2026-08-22T09:30");
    expect(zonedLocalDateTimeToIsoStrict(wall, "America/Los_Angeles")).toBe(instant);
    expect(isoInstantToZonedLocalDateTime(instant, "Asia/Tokyo")).toBe(
      "2026-08-23T01:30"
    );
  });

  it("rejects a nonexistent DST spring-forward wall time", () => {
    let error: unknown;
    try {
      zonedLocalDateTimeToIsoStrict("2026-03-08T02:30", "America/New_York");
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ZonedDateTimeError);
    expect(error).toMatchObject({ code: "NONEXISTENT_LOCAL_DATE_TIME" });
  });

  it("rejects an ambiguous DST fall-back wall time instead of picking an offset", () => {
    let error: unknown;
    try {
      zonedLocalDateTimeToIsoStrict("2026-11-01T01:30", "America/New_York");
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ZonedDateTimeError);
    expect(error).toMatchObject({ code: "AMBIGUOUS_LOCAL_DATE_TIME" });
  });

  it("preserves a known saved instant when its reopened wall time is ambiguous", () => {
    const firstOccurrence = "2026-11-01T05:30:00.000Z";
    const wall = isoInstantToZonedLocalDateTime(firstOccurrence, "America/New_York");
    expect(wall).toBe("2026-11-01T01:30");
    expect(zonedLocalDateTimeToIsoStrict(wall, "America/New_York", firstOccurrence)).toBe(
      firstOccurrence
    );
  });

  it("preserves seconds and milliseconds from an unchanged saved instant", () => {
    const preciseInstant = "2026-08-22T16:30:45.678Z";
    const wall = isoInstantToZonedLocalDateTime(preciseInstant, "America/Los_Angeles");
    expect(wall).toBe("2026-08-22T09:30");
    expect(
      zonedLocalDateTimeToIsoStrict(wall, "America/Los_Angeles", preciseInstant)
    ).toBe(preciseInstant);
  });
});
