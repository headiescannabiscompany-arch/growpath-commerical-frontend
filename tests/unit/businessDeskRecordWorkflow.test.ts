import { describe, expect, it } from "@jest/globals";

import {
  businessDeskRecordId,
  isoToLocalDate,
  isoToLocalDateTime,
  localDateToIso,
  localDateTimeToIso,
  newBusinessDeskOperationKey
} from "@/features/businessDesk/recordWorkflow";

describe("Business Desk record workflow helpers", () => {
  it("normalizes record identities without inventing one", () => {
    expect(
      businessDeskRecordId({
        _id: "record-1",
        kind: "lead",
        title: "Lead",
        status: "new",
        version: 1,
        payload: {}
      })
    ).toBe("record-1");
    expect(businessDeskRecordId(null)).toBe("");
  });

  it("creates distinct operation-scoped idempotency keys", () => {
    const first = newBusinessDeskOperationKey("lead create");
    const second = newBusinessDeskOperationKey("lead create");
    expect(first).toMatch(/^lead-create-/);
    expect(second).not.toBe(first);
  });

  it("round-trips local calendar values through an absolute instant", () => {
    const local = "2026-08-22T14:35";
    const iso = localDateTimeToIso(local);
    expect(iso).toMatch(/Z$/);
    expect(isoToLocalDateTime(iso)).toBe(local);
  });

  it("rejects impossible local dates", () => {
    expect(() => localDateTimeToIso("2026-02-30T09:00")).toThrow(
      "valid local date and time"
    );
  });

  it("round-trips a calendar date without shifting the selected local day", () => {
    const iso = localDateToIso("2026-08-22");
    expect(isoToLocalDate(iso)).toBe("2026-08-22");
    expect(localDateToIso("")).toBeNull();
    expect(() => localDateToIso("2026-02-30")).toThrow("valid date");
  });
});
