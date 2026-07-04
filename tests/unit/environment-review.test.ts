import { reviewEnvironmentReadings } from "@/features/personal/tools/environmentReview";

describe("reviewEnvironmentReadings", () => {
  it("flags high humidity and tight dew point spread in flower", () => {
    const review = reviewEnvironmentReadings({
      stage: "late_flower",
      tempDayC: 22,
      tempNightC: 16,
      humidity: 78,
      vpd: 0.55,
      dli: 48,
      lightHours: 12
    });

    expect(review.riskLevel).toBe("high");
    expect(review.dewPointC).toEqual(expect.any(Number));
    expect(review.warnings).toEqual(
      expect.arrayContaining([
        "High humidity in flower increases mold and bud rot risk.",
        "Dew point spread is tight; inspect dense canopy and flower surfaces.",
        "Low VPD can reduce transpiration and contribute to calcium-transport symptoms.",
        "Very high DLI late flower can add heat/light pressure and reduce finish quality if plants are not tolerating it."
      ])
    );
  });

  it("flags excessive light for seedlings and clones", () => {
    const review = reviewEnvironmentReadings({
      stage: "clone",
      ppfd: 450,
      lightHours: 18
    });

    expect(review.riskLevel).toBe("medium");
    expect(review.warnings).toContain(
      "Seedlings/clones may be under too much light for stable rooting and early growth."
    );
  });
});
