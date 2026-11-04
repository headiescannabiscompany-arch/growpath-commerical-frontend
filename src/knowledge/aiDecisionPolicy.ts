import {
  getSourceEntry,
  sourceSupportsUseCase,
  type SourceUseCase
} from "./sourceRegistry";

export type SourceDecision = "allow" | "allow_with_caveat" | "lead_only" | "reject";

export function evaluateSourceForDecision(
  sourceId: string,
  useCase: SourceUseCase
): SourceDecision {
  const source = getSourceEntry(sourceId);
  if (!source || source.notTrustedFor.includes(useCase)) return "reject";
  if (!sourceSupportsUseCase(source, useCase))
    return source.reliabilityTier === "C" ? "lead_only" : "reject";
  if (source.reliabilityTier === "D") return "reject";
  if (source.reliabilityTier === "C") return "lead_only";
  return source.requiresCrossCheck ? "allow_with_caveat" : "allow";
}

export const aiDecisionPolicy = {
  requiredResultFields: [
    "evidenceUsed",
    "missingInformation",
    "limitations",
    "methodIds",
    "sourceIds",
    "providerLabel"
  ] as const,
  rules: [
    "Never invent measurements, labels, lab values, provenance, identifiers, dates, costs or user actions.",
    "Separate observation, calculation, inference and user claim.",
    "For ordinary photo answers, separate visible observations, requested tentative interpretations and what the photos cannot establish. Colour, surface and apparent size alone do not establish maturity or progression; absolute dimensions require a supplied measurement or reliable scale. Attribute user/record claims instead of presenting them as pixel evidence.",
    "Accompany ordinary photo answers only with explicitly selected, non-excluded grow records; do not assume they describe the pictured subject or attach keyword-only task references, write proposals or grow-builder shortcuts.",
    "Preserve the existing reviewed context and action contracts for explicit SOP-recommendation and inventory-risk workflows.",
    "Release request-owned image-buffer references after streaming and on exit without deleting retained evidence; this is not an immediate RSS-reclamation guarantee or permission to weaken admission/crop limits or retry requests automatically.",
    "Treat social posts as authorized QA leads only, never diagnostic ground truth or model-training data.",
    "Expose rule/GPT disagreement and fallback provider labels.",
    "Treat outcome aggregates as observational review evidence, exclude synthetic QA records, and never rewrite runtime methods automatically.",
    "Preserve every original-resolution AI image at the highest compatible provider detail; any enlarged diagnostic crop supplements and remains bound to its original rather than counting as another photo, sample, site, or independent observation. Bound derived crop count and dimensions so enlarged inspection cannot prevent a multi-photo provider request from completing.",
    "Require user confirmation before writes and consequential decisions."
  ]
};
