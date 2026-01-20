import { describe, it, expect } from "@jest/globals";
import { groupItemsByDate, toDateKey } from "../../src/utils/calendar.js";

describe("calendar utils", () => {
  it("toDateKey normalizes valid inputs and skips invalid dates", () => {
    const iso = toDateKey("2025-12-31T04:00:00.000Z");
    expect(iso).toBe("2025-12-31");

    const fromDate = toDateKey(new Date("2024-01-02T00:00:00.000Z"));
    expect(fromDate).toBe("2024-01-02");

    expect(toDateKey(null)).toBeNull();
    expect(toDateKey("not-a-date")).toBeNull();
  });

  it("groupItemsByDate skips invalid entries and groups items by resolved key", () => {
    const grouped = groupItemsByDate(
      [
        { id: 1, date: "2025-01-01T02:00:00.000Z" },
        { id: 2, date: "2025-01-01T20:00:00.000Z" },
        { id: 3, date: null },
        { id: 4, date: "invalid" },
        { id: 5, recordedAt: "2025-01-02T05:00:00.000Z" }
      ],
      (item) => item.date || item.recordedAt
    );

    expect(Object.keys(grouped).sort()).toEqual(["2025-01-01", "2025-01-02"]);
    expect(grouped["2025-01-01"].length).toBe(2);
    expect(grouped["2025-01-02"][0].id).toBe(5);
  });
});
