import {
  formatFacilityAuditAction,
  formatFacilityAuditDetails
} from "@/utils/facilityAuditPresentation";
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
    ).toBe("Room check | Status: Open");
    expect(
      formatFacilityAuditDetails(
        "ROOM_UPDATED",
        "Room 6a563c662fb9f669d231a012 updated in facility 6a563bec2fb9f669d2319fa5"
      )
    ).toBe("Open the full audit log for recorded details.");
  });

  it("keeps unavailable compliance evidence visibly unknown", () => {
    expect(formatMissedComplianceCount(null)).toBe("Not tracked");
    expect(formatMissedComplianceCount(undefined)).toBe("Not tracked");
    expect(formatMissedComplianceCount(0)).toBe(0);
  });
});
