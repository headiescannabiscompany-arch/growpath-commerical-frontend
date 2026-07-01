import {
  buildEnvironmentContextAssumption,
  buildEnvironmentContextNotices
} from "@/features/personal/tools/environmentContext";

describe("environment context notices", () => {
  it("warns when no crop context is selected", () => {
    const notices = buildEnvironmentContextNotices(null);
    expect(notices[0]).toMatchObject({
      key: "crop-context-missing",
      severity: "medium"
    });
    expect(notices[0].message).toContain("generic controlled-environment guidance");
    expect(buildEnvironmentContextAssumption(null)).toContain("No crop profile");
  });

  it("warns when selected crop identity is not confirmed", () => {
    const notices = buildEnvironmentContextNotices({
      cropCommonName: "Olive",
      scientificName: "Olea europaea",
      growthProfile: { confirmationStatus: "needs_confirmation" }
    });
    expect(notices[0]).toMatchObject({
      key: "crop-context-unconfirmed",
      severity: "medium"
    });
    expect(notices[0].message).toContain("not confirmed");
  });

  it("shows confirmed selected crop context", () => {
    const context = {
      cropCommonName: "Olive",
      scientificName: "Olea europaea",
      cultivarOrStrain: "Arbequina",
      cropProfileId: "crop-olive-1"
    };
    const notices = buildEnvironmentContextNotices(context);
    expect(notices[0]).toMatchObject({
      key: "crop-context-confirmed",
      severity: "info"
    });
    expect(notices[0].message).toContain("Olive");
    expect(buildEnvironmentContextAssumption(context)).toContain("Olive / Arbequina");
  });
});
