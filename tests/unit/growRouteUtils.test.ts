import { fmtDate, localCalendarDate } from "@/features/grows/routeUtils";

describe("grow route date utilities", () => {
  it("renders stored calendar dates without shifting to the previous local day", () => {
    expect(fmtDate("2026-08-25")).toBe(new Date(2026, 7, 25).toLocaleDateString());
    expect(fmtDate("2026-08-25T00:00:00.000Z")).toBe(
      new Date(2026, 7, 25).toLocaleDateString()
    );
  });

  it("builds the default calendar value from local date parts instead of UTC", () => {
    expect(localCalendarDate(new Date(2026, 7, 25, 23, 30))).toBe("2026-08-25");
  });
});
