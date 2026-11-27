import { normalizeTelemetryTimestamp } from "../../src/features/personal/tools/dewPointGuard/engine";

describe("timezone conversion for controller-history CSVs", () => {
  test.each([
    ["America/New_York", "2026-03-08 01:59:59", "2026-03-08T06:59:59.000Z"],
    ["America/New_York", "2026-03-08 02:15:00", "2026-03-08T07:15:00.000Z"],
    ["America/New_York", "2026-03-08 03:00:00", "2026-03-08T07:00:00.000Z"],
    ["America/New_York", "2026-11-01 01:30:00", "2026-11-01T05:30:00.000Z"],
    ["America/Los_Angeles", "2026-11-01 01:30:00", "2026-11-01T08:30:00.000Z"],
    ["Asia/Kathmandu", "2026-03-08 02:15:00", "2026-03-07T20:30:00.000Z"],
    ["Australia/Lord_Howe", "2026-04-05 01:45:00", "2026-04-04T15:15:00.000Z"],
    ["UTC", "2026-03-08 02:15:00", "2026-03-08T02:15:00.000Z"],
    ["Invalid/Zone", "2026-03-08 02:15:00", null],
    ["Invalid/Zone", "2026-03-08T02:15:00-05:00", "2026-03-08T07:15:00.000Z"]
  ])("preserves prior timestamps for %s at %s", (zone, raw, expected) => {
    expect(normalizeTelemetryTimestamp(raw!, zone!)).toBe(expected);
  });

  test("constructs only one formatter across many readings in the same timezone", () => {
    const constructor = jest.spyOn(Intl, "DateTimeFormat");
    try {
      for (let hour = 0; hour < 24; hour++) {
        const raw = `2026-06-24 ${String(hour).padStart(2, "0")}:00:00`;
        expect(normalizeTelemetryTimestamp(raw, "Europe/Berlin")).not.toBeNull();
      }
      expect(constructor).toHaveBeenCalledTimes(1);
    } finally {
      constructor.mockRestore();
    }
  });
});
