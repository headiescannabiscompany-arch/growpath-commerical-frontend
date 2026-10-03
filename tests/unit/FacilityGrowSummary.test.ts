import {
  facilityGrowDateSummary,
  facilityGrowRoomLabel,
  facilityGrowSubtitle,
  readableFacilityGrowDate
} from "@/features/facility/growSummary";

describe("Facility grow summaries", () => {
  it("resolves only the exact saved room and prefers its current name", () => {
    expect(
      facilityGrowRoomLabel({ roomId: "one", roomName: "Old name" }, [
        { id: "two", name: "Wrong room" },
        { _id: "one", name: "Current room" }
      ])
    ).toBe("Current room");
  });
  it("uses saved embedded room names without stringifying objects", () => {
    expect(
      facilityGrowRoomLabel({ room: { _id: "one", name: "Embedded room" } }, [])
    ).toBe("Embedded room");
    expect(facilityGrowRoomLabel({ roomId: "one", roomName: "Saved name" }, [])).toBe(
      "Saved name"
    );
  });
  it.each([
    [{ roomId: "6a5ea11785cee9a1c3f969c7" }, [], "Linked room"],
    [{ roomId: "one" }, [{ id: "one", name: "one" }], "Linked room"],
    [{ room: { _id: "one" } }, [], "Linked room"],
    [{ room: "one" }, [], "Linked room"],
    [{ roomName: { name: "Malformed" } }, [], "Not set"],
    [{}, [], "Not set"]
  ])("keeps unavailable room metadata readable %#", (grow, rooms, expected) => {
    expect(facilityGrowRoomLabel(grow as any, rooms as any)).toBe(expected);
  });
  it("does not invent a start date from creation time", () => {
    expect(facilityGrowDateSummary({ createdAt: "2026-07-20" })).toEqual({
      label: "Created",
      value: "Jul 20, 2026"
    });
    expect(
      facilityGrowDateSummary({ startDate: "2026-07-21", createdAt: "2026-07-20" })
    ).toEqual({ label: "Started", value: "Jul 21, 2026" });
    expect(facilityGrowDateSummary({})).toEqual({ label: "Started", value: "Not set" });
  });
  it.each([
    "garbage",
    "2026-02-30",
    "2025-02-29",
    "2026-13-01",
    "2026-01-00",
    "2026-07-20Tinvalid",
    {},
    123
  ])("keeps invalid dates unavailable: %s", (value) => {
    expect(readableFacilityGrowDate(value)).toBe("Date unavailable");
  });
  it("accepts leap days and missing dates", () => {
    expect(readableFacilityGrowDate("2024-02-29")).toBe("Feb 29, 2024");
    expect(readableFacilityGrowDate(null)).toBe("Not set");
    expect(readableFacilityGrowDate("")).toBe("Not set");
  });
  it("pins calendar-only dates to their chosen day, but preserves timestamp timezone behavior", () => {
    const format = jest.spyOn(Date.prototype, "toLocaleDateString");
    readableFacilityGrowDate("2026-07-20");
    expect(format).toHaveBeenLastCalledWith(
      undefined,
      expect.objectContaining({ timeZone: "UTC" })
    );
    readableFacilityGrowDate("2026-07-20T22:28:39.596Z");
    expect(format.mock.calls.at(-1)?.[1]).not.toHaveProperty("timeZone");
    format.mockRestore();
  });
  it("formats a complete summary without raw IDs or timestamps", () => {
    expect(
      facilityGrowSubtitle(
        { roomId: "one", phase: "in_progress", startDate: "2026-07-20" },
        [{ id: "one", name: "Propagation" }]
      )
    ).toBe("Room: Propagation · Phase: In progress · Started: Jul 20, 2026");
  });
});
