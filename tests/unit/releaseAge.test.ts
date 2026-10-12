import { releaseAgeLabel, releaseDay } from "@/utils/releaseAge";
import { latestGroupRelease, PUBLIC_UPDATE_GROUPS } from "@/config/publicUpdateGroups";

describe("public release age", () => {
  it("counts local calendar dates including singular and today", () => {
    expect(releaseAgeLabel("October 5, 2026", new Date(2026, 9, 5, 23))).toBe(
      "Released today · 0 days ago"
    );
    expect(releaseAgeLabel("October 5, 2026", new Date(2026, 9, 6))).toBe(
      "Released 1 day ago"
    );
    expect(releaseAgeLabel("October 5, 2026", new Date(2026, 9, 8))).toBe(
      "Released 3 days ago"
    );
  });
  it("does not count malformed or future release dates", () => {
    expect(releaseDay("February 30, 2026")).toBeNull();
    expect(releaseDay("13/05/2026")).toBeNull();
    expect(releaseAgeLabel("October 6, 2026", new Date(2026, 9, 5))).toBeNull();
    expect(releaseAgeLabel("October 5, 2026", new Date(NaN))).toBeNull();
  });
  it("counts calendar days across leap days, year boundaries and DST weekends", () => {
    expect(releaseAgeLabel("February 28, 2024", new Date(2024, 2, 1))).toBe(
      "Released 2 days ago"
    );
    expect(releaseAgeLabel("December 31, 2025", new Date(2026, 0, 1))).toBe(
      "Released 1 day ago"
    );
    expect(releaseAgeLabel("March 7, 2026", new Date(2026, 2, 9))).toBe(
      "Released 2 days ago"
    );
    expect(releaseAgeLabel("October 31, 2026", new Date(2026, 10, 2))).toBe(
      "Released 2 days ago"
    );
  });
  it("uses only actual released notes, not later plans or progress reviews", () => {
    const group = {
      id: "test",
      tab: "test",
      title: "test",
      status: "partial" as const,
      scope: "",
      live: "",
      next: "",
      entryIds: ["private-feedback-collection", "course-gifting"]
    };
    expect(latestGroupRelease(group, new Date(2026, 9, 6))).toBe("October 4, 2026");
    expect(
      latestGroupRelease({ ...group, entryIds: ["course-gifting"] }, new Date(2026, 9, 6))
    ).toBeNull();
  });
  it.each(["shopping", "courses"])(
    "uses the verified signup release date for the existing %s milestone",
    (id) => {
      const group = PUBLIC_UPDATE_GROUPS.find((item) => item.id === id)!;
      expect(group.status).toBe("partial");
      const latest = latestGroupRelease(group, new Date(2026, 9, 12));
      expect(latest).toBe("October 12, 2026");
      expect(releaseAgeLabel(latest!, new Date(2026, 9, 12))).toBe(
        "Released today · 0 days ago"
      );
    }
  );
});
