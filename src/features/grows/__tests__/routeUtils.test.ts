import { hasCannabisWorkflowEvidence, isCannabisGrow } from "../routeUtils";

describe("cannabis grow context", () => {
  it("uses structured cannabis crop metadata", () => {
    expect(
      isCannabisGrow({
        id: "grow-1",
        growTags: ["Cannabis", "Indoor"],
        cropTypes: ["Cannabis"]
      } as any)
    ).toBe(true);
  });

  it("preserves untagged legacy cannabis grows without guessing from the name", () => {
    expect(
      isCannabisGrow({
        id: "grow-legacy",
        name: "Legacy grow",
        strain: "Bruce Banner"
      } as any)
    ).toBe(true);
    expect(
      isCannabisGrow({
        id: "grow-name-only",
        name: "Bruce Banner"
      } as any)
    ).toBe(false);
  });

  it("does not treat a structured non-cannabis cultivar as cannabis", () => {
    expect(
      isCannabisGrow({
        id: "grow-tomato",
        cultivar: "Sunviva",
        cropTypes: ["Tomato"],
        growInterests: { crops: ["Vegetables"] }
      } as any)
    ).toBe(false);
  });

  it("recognizes attached cannabis-only workflow evidence", () => {
    expect(hasCannabisWorkflowEvidence([{ toolName: "harvest_readiness" }])).toBe(true);
    expect(
      isCannabisGrow({ id: "grow-legacy" } as any, [{ toolType: "harvest-readiness" }])
    ).toBe(true);
  });
});
