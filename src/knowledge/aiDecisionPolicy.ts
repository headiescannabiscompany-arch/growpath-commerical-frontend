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
    "Expose rule/GPT disagreement and fallback provider labels.",
    "Require user confirmation before writes and consequential decisions."
  ]
};
