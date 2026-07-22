import {
  formatFacilityAuditAction,
  formatFacilityAuditDetails
} from "@/app/home/facility/(tabs)/compliance";
import { formatMissedComplianceCount } from "@/app/home/facility/(tabs)/reports";

describe("Facility reporting presentation", () => {
  it("summarizes structured audit details without exposing internal room ids", () => {
    const details = JSON.stringify({ roomIds: ["room-1", "room-2", "room-3"] });

    expect(formatFacilityAuditAction("ROOMS_REORDERED")).toBe("Rooms Reordered");
    expect(formatFacilityAuditDetails("ROOMS_REORDERED", details)).toBe(
      "3 rooms reordered."
    );
    expect(
      formatFacilityAuditDetails("TASK_CREATED", '{"title":"Room check","status":"OPEN"}')
    ).toBe("Room check · Status: Open");
  });

  it("keeps unavailable compliance evidence visibly unknown", () => {
    expect(formatMissedComplianceCount(null)).toBe("Not tracked");
    expect(formatMissedComplianceCount(undefined)).toBe("Not tracked");
    expect(formatMissedComplianceCount(0)).toBe(0);
  });
});
