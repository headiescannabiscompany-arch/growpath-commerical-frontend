import {
  formatFacilityAuditAction,
  formatFacilityAuditDetails
} from "@/utils/facilityAuditPresentation";
import {
  buildReadinessSummary,
  facilityComplianceExportFilename,
  formatMissedComplianceCount
} from "@/app/home/facility/(tabs)/reports";

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

  it("uses a readable, filesystem-safe Facility name for compliance exports", () => {
    expect(
      facilityComplianceExportFilename(
        "Triple Bag Genetics, llc",
        "507f1f77bcf86cd799439011"
      )
    ).toBe("triple-bag-genetics-llc-compliance-export.json");
    expect(
      facilityComplianceExportFilename(
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439011"
      )
    ).toBe("selected-facility-compliance-export.json");
  });

  it("keeps resolved deviations as evidence without treating them as open cleanup", () => {
    const summary = buildReadinessSummary(
      { deviations: 1, auditLogs: 49, sopRuns: 1 },
      {
        totalRuns: 1,
        completedRuns: 1,
        inProgressRuns: 0,
        totalSteps: 3,
        doneSteps: 3,
        skippedSteps: 0,
        pendingSteps: 0,
        runsMissingSteps: 0
      },
      {
        totalDeviations: 1,
        openDeviations: 0,
        resolvedDeviations: 1,
        cancelledDeviations: 0
      }
    );

    expect(summary.status).toBe("Ready");
    expect(summary.issues).toContain(
      "Packet has audit, SOP, and compliance evidence coverage."
    );
  });
});
