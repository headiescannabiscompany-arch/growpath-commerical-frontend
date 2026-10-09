import {
  getFeedCampaignTimeZone,
  resolveFeedCampaignSchedule
} from "@/utils/feedCampaignSchedule";

describe("Feed campaign wall-clock boundary", () => {
  it.each([
    ["2026-10-09T12:58", "America/New_York", "2026-10-09T16:58:00.000Z"],
    ["2026-01-09T12:58", "America/New_York", "2026-01-09T17:58:00.000Z"],
    ["2026-07-17T21:00", "America/New_York", "2026-07-18T01:00:00.000Z"],
    ["2026-10-09T00:15", "Asia/Kathmandu", "2026-10-08T18:30:00.000Z"],
    ["2026-10-09T12:58", "UTC", "2026-10-09T12:58:00.000Z"],
    ["2026-12-31T23:59", "America/Los_Angeles", "2027-01-01T07:59:00.000Z"]
  ])("converts %s in %s without assuming the server timezone", (local, zone, iso) => {
    expect(resolveFeedCampaignSchedule(` ${local} `, "", zone)).toEqual({
      startsAt: iso,
      endsAt: undefined,
      warnings: []
    });
    expect(resolveFeedCampaignSchedule("", local, zone)).toEqual({
      startsAt: undefined,
      endsAt: iso,
      warnings: []
    });
  });

  it("keeps blank timing optional even without a device timezone", () => {
    expect(resolveFeedCampaignSchedule(" ", "", "")).toEqual({
      startsAt: undefined,
      endsAt: undefined,
      warnings: []
    });
  });

  it.each([
    ["2026-03-08T02:30", /does not exist/],
    ["2026-11-01T01:30", /occurs twice/],
    ["2026-02-30T12:00", /valid local date and time/],
    ["2026-10-09T24:00", /valid local date and time/],
    ["2026-10-09", /valid local date and time/],
    ["not a date", /valid local date and time/]
  ])("blocks invalid or ambiguous selection %s without guessing", (value, message) => {
    const schedule = resolveFeedCampaignSchedule(value, "", "America/New_York");
    expect(schedule.startsAt).toBeUndefined();
    expect(schedule.warnings).toHaveLength(1);
    expect(schedule.warnings[0]).toMatch(/^Campaign start:/);
    expect(schedule.warnings[0]).toMatch(message);
  });

  it("labels an invalid end separately and retains the valid start", () => {
    expect(
      resolveFeedCampaignSchedule(
        "2026-03-08T01:30",
        "2026-03-08T02:30",
        "America/New_York"
      )
    ).toEqual({
      startsAt: "2026-03-08T06:30:00.000Z",
      endsAt: undefined,
      warnings: [expect.stringMatching(/^Campaign end:.*does not exist/)]
    });
  });

  it.each(["2026-10-09T12:57", "2026-10-09T12:58"])(
    "rejects end %s that is not after its start",
    (end) => {
      expect(
        resolveFeedCampaignSchedule("2026-10-09T12:58", end, "America/New_York").warnings
      ).toEqual(["Campaign end must be after its start."]);
    }
  );

  it("compares resolved instants across a clock change", () => {
    const schedule = resolveFeedCampaignSchedule(
      "2026-03-08T01:30",
      "2026-03-08T03:30",
      "America/New_York"
    );
    expect(schedule).toEqual({
      startsAt: "2026-03-08T06:30:00.000Z",
      endsAt: "2026-03-08T07:30:00.000Z",
      warnings: []
    });
  });

  it.each(["", "not-a-zone"])("does not default unknown zone %s to UTC", (zone) => {
    const schedule = resolveFeedCampaignSchedule("2026-10-09T12:58", "", zone);
    expect(schedule.startsAt).toBeUndefined();
    expect(schedule.warnings).toHaveLength(1);
  });

  it("uses the runtime device zone and fails closed when it cannot be read", () => {
    expect(getFeedCampaignTimeZone()).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );
    const spy = jest.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new Error("Timezone unavailable");
    });
    expect(getFeedCampaignTimeZone()).toBe("");
    spy.mockRestore();
  });
});
