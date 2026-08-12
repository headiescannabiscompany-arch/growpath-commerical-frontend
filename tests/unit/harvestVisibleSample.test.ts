import {
  inspectedPhotoEstimateCounts,
  inspectedPhotoEstimateHeader,
  inspectedPhotoEstimatePercentages,
  inspectedPhotoEstimates,
  strongestInspectedAmberSignal
} from "@/features/personal/tools/harvestVisibleSample";

describe("harvest visible-sample photo breakdown", () => {
  it("keeps each eligible inspected area separate and exposes its amber range", () => {
    const estimates = inspectedPhotoEstimates([
      {
        imageIndex: 2,
        role: "middle_macro",
        usableForDistribution: false,
        usableForVisibleSample: true,
        trichomeRichRegion: "center calyx",
        excludedReason: "Representative site coverage is incomplete.",
        focus: "partial",
        glare: "localized",
        visibleHeadDetail: "limited",
        resolvedHeadCounts: {
          clear: 4,
          cloudy: 14,
          amber: 4,
          amberOrWarmLight: 8,
          cloudyOrGlare: 10
        },
        resolvedHeadTotal: 40,
        countingConfidence: "medium"
      },
      {
        imageIndex: 1,
        role: "top_macro",
        usableForDistribution: true,
        usableForVisibleSample: true,
        trichomeRichRegion: "upper-right calyx",
        excludedReason: "",
        focus: "sharp",
        glare: "none",
        visibleHeadDetail: "sufficient",
        resolvedHeadCounts: {
          clear: 1,
          cloudy: 5,
          amber: 3,
          amberOrWarmLight: 1,
          cloudyOrGlare: 0
        },
        resolvedHeadTotal: 10,
        countingConfidence: "high"
      }
    ]);

    expect(estimates.map((estimate) => estimate.imageIndex)).toEqual([1, 2]);
    expect(inspectedPhotoEstimateHeader(estimates[0])).toBe(
      "Photo 1 | top macro | upper-right calyx | 10 heads | high confidence"
    );
    expect(inspectedPhotoEstimatePercentages(estimates[0])).toBe(
      "10% clear | 50% cloudy | 30% confirmed amber to 40% possible amber | 0% cloudy or glare"
    );
    expect(inspectedPhotoEstimateCounts(estimates[1])).toBe(
      "Counts: 4 clear / 14 cloudy / 4 confirmed amber / 8 amber or warm light / 10 cloudy or glare"
    );
    expect(strongestInspectedAmberSignal(estimates)).toBe(
      "Photo 1 has the strongest inspected amber signal: 30% confirmed amber to 40% possible amber in upper-right calyx. Compare this sampled area with the other listed areas; it is not a whole-plant percentage."
    );
  });

  it("does not surface blurred, blocking-glare, unresolved, or not-counted tallies", () => {
    const base = {
      imageIndex: 1,
      role: "additional_macro" as const,
      usableForDistribution: false,
      usableForVisibleSample: true,
      trichomeRichRegion: "center calyx",
      excludedReason: "",
      focus: "sharp" as const,
      glare: "none" as const,
      visibleHeadDetail: "sufficient" as const,
      resolvedHeadCounts: {
        clear: 1,
        cloudy: 1,
        amber: 1,
        amberOrWarmLight: 1,
        cloudyOrGlare: 1
      },
      resolvedHeadTotal: 5,
      countingConfidence: "low" as const
    };

    expect(
      inspectedPhotoEstimates([
        { ...base, imageIndex: 1, focus: "blurred" },
        { ...base, imageIndex: 2, glare: "blocking" },
        { ...base, imageIndex: 3, visibleHeadDetail: "unresolved" },
        { ...base, imageIndex: 4, countingConfidence: "not_counted" },
        { ...base, imageIndex: 5, usableForVisibleSample: false }
      ])
    ).toEqual([]);
  });
});
