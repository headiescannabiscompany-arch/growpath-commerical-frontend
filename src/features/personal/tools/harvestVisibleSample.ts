import type { TrichomeVisionResult } from "@/api/harvestVision";

type ImageFinding = NonNullable<TrichomeVisionResult["imageFindings"]>[number];

export type InspectedPhotoEstimate = {
  imageIndex: number;
  role: ImageFinding["role"];
  region: string;
  totalHeads: number;
  countingConfidence: NonNullable<ImageFinding["countingConfidence"]>;
  counts: {
    clear: number;
    cloudy: number;
    confirmedAmber: number;
    amberOrWarmLight: number;
    cloudyOrGlare: number;
  };
  percentages: {
    clear: number;
    cloudy: number;
    confirmedAmber: number;
    possibleAmber: number;
    cloudyOrGlare: number;
  };
};

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function inspectedPhotoEstimates(
  findings: TrichomeVisionResult["imageFindings"] | null | undefined
): InspectedPhotoEstimate[] {
  if (!Array.isArray(findings)) return [];

  return findings
    .filter(
      (finding) =>
        finding?.usableForVisibleSample === true &&
        finding.countingConfidence !== "not_counted" &&
        finding.focus !== "blurred" &&
        finding.glare !== "blocking" &&
        finding.visibleHeadDetail !== "unresolved" &&
        finding.resolvedHeadCounts
    )
    .map((finding) => {
      const counts = {
        clear: count(finding.resolvedHeadCounts?.clear),
        cloudy: count(finding.resolvedHeadCounts?.cloudy),
        confirmedAmber: count(finding.resolvedHeadCounts?.amber),
        amberOrWarmLight: count(finding.resolvedHeadCounts?.amberOrWarmLight),
        cloudyOrGlare: count(finding.resolvedHeadCounts?.cloudyOrGlare)
      };
      const totalHeads = Object.values(counts).reduce((sum, value) => sum + value, 0);
      return {
        imageIndex: Number(finding.imageIndex),
        role: finding.role,
        region: String(finding.trichomeRichRegion || "reported calyx region").trim(),
        totalHeads,
        countingConfidence: finding.countingConfidence || "low",
        counts,
        percentages: {
          clear: percent(counts.clear, totalHeads),
          cloudy: percent(counts.cloudy, totalHeads),
          confirmedAmber: percent(counts.confirmedAmber, totalHeads),
          possibleAmber: percent(
            counts.confirmedAmber + counts.amberOrWarmLight,
            totalHeads
          ),
          cloudyOrGlare: percent(counts.cloudyOrGlare, totalHeads)
        }
      } satisfies InspectedPhotoEstimate;
    })
    .filter((estimate) => estimate.totalHeads > 0)
    .sort((left, right) => left.imageIndex - right.imageIndex);
}

export function inspectedPhotoEstimateHeader(estimate: InspectedPhotoEstimate) {
  return `Photo ${estimate.imageIndex} | ${estimate.role.replaceAll("_", " ")} | ${estimate.region} | ${estimate.totalHeads} heads | ${estimate.countingConfidence} confidence`;
}

export function inspectedPhotoEstimatePercentages(estimate: InspectedPhotoEstimate) {
  const { percentages } = estimate;
  return `${percentages.clear}% clear | ${percentages.cloudy}% cloudy | ${percentages.confirmedAmber}% confirmed amber to ${percentages.possibleAmber}% possible amber | ${percentages.cloudyOrGlare}% cloudy or glare`;
}

export function inspectedPhotoEstimateCounts(estimate: InspectedPhotoEstimate) {
  const { counts } = estimate;
  return `Counts: ${counts.clear} clear / ${counts.cloudy} cloudy / ${counts.confirmedAmber} confirmed amber / ${counts.amberOrWarmLight} amber or warm light / ${counts.cloudyOrGlare} cloudy or glare`;
}

export function strongestInspectedAmberSignal(estimates: InspectedPhotoEstimate[]) {
  if (!estimates.length) return "";
  const strongest = [...estimates].sort(
    (left, right) =>
      right.percentages.confirmedAmber - left.percentages.confirmedAmber ||
      right.percentages.possibleAmber - left.percentages.possibleAmber ||
      right.totalHeads - left.totalHeads
  )[0];
  if (!strongest || strongest.percentages.possibleAmber <= 0) return "";
  return `Photo ${strongest.imageIndex} has the strongest inspected amber signal: ${strongest.percentages.confirmedAmber}% confirmed amber to ${strongest.percentages.possibleAmber}% possible amber in ${strongest.region}. Compare this sampled area with the other listed areas; it is not a whole-plant percentage.`;
}
