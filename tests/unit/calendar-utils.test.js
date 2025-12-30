import { describe, it } from "node:test";
import assert from "node:assert";
import { groupItemsByDate, toDateKey } from "../../src/utils/calendar.js";

describe("calendar utils", () => {
  it("toDateKey normalizes valid inputs and skips invalid dates", () => {
    const iso = toDateKey("2025-12-31T04:00:00.000Z");
    assert.strictEqual(iso, "2025-12-31");

    const fromDate = toDateKey(new Date("2024-01-02T00:00:00.000Z"));
    assert.strictEqual(fromDate, "2024-01-02");

    assert.strictEqual(toDateKey(null), null);
    assert.strictEqual(toDateKey("not-a-date"), null);
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

    assert.deepStrictEqual(Object.keys(grouped).sort(), ["2025-01-01", "2025-01-02"]);
    assert.strictEqual(grouped["2025-01-01"].length, 2);
    assert.strictEqual(grouped["2025-01-02"][0].id, 5);
  });
});
