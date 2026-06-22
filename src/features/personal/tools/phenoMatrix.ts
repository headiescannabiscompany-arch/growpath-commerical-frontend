export type PhenoTraitKey =
  | "vigor"
  | "structure"
  | "aroma"
  | "resin"
  | "yield"
  | "resistance"
  | "uniformity";

export type PhenoTraitWeights = Record<PhenoTraitKey, number>;

export type PhenoCandidateInput = {
  id: string;
  label: string;
  generation: string;
  stage: string;
  vigor: number;
  structure: number;
  aroma: number;
  resin: number;
  yield: number;
  resistance: number;
  uniformity: number;
  notes?: string;
};

export type PhenoCandidateScore = PhenoCandidateInput & {
  totalScore: number;
  normalizedScore: number;
  rank: number;
  recommendation: "keeper" | "watch" | "cull";
};

export const PHENO_TRAITS: { key: PhenoTraitKey; label: string }[] = [
  { key: "vigor", label: "Vigor" },
  { key: "structure", label: "Structure" },
  { key: "aroma", label: "Aroma" },
  { key: "resin", label: "Resin" },
  { key: "yield", label: "Yield" },
  { key: "resistance", label: "Resistance" },
  { key: "uniformity", label: "Uniformity" }
];

export const DEFAULT_PHENO_WEIGHTS: PhenoTraitWeights = {
  vigor: 1,
  structure: 1,
  aroma: 1,
  resin: 1,
  yield: 1,
  resistance: 1,
  uniformity: 1
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10, Math.max(0, value));
}

function positiveWeight(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function scorePhenoCandidate(
  candidate: PhenoCandidateInput,
  weights: PhenoTraitWeights = DEFAULT_PHENO_WEIGHTS
): Omit<PhenoCandidateScore, "rank"> {
  const totalWeight = PHENO_TRAITS.reduce(
    (sum, trait) => sum + positiveWeight(weights[trait.key]),
    0
  );
  const weightedScore = PHENO_TRAITS.reduce(
    (sum, trait) =>
      sum + clampScore(candidate[trait.key]) * positiveWeight(weights[trait.key]),
    0
  );
  const normalizedScore = totalWeight ? weightedScore / totalWeight : 0;
  const recommendation =
    normalizedScore >= 8 ? "keeper" : normalizedScore >= 6 ? "watch" : "cull";

  return {
    ...candidate,
    totalScore: Number(weightedScore.toFixed(2)),
    normalizedScore: Number(normalizedScore.toFixed(2)),
    recommendation
  };
}

export function rankPhenoCandidates(
  candidates: PhenoCandidateInput[],
  weights: PhenoTraitWeights = DEFAULT_PHENO_WEIGHTS
): PhenoCandidateScore[] {
  return candidates
    .map((candidate) => scorePhenoCandidate(candidate, weights))
    .sort((a, b) => {
      if (b.normalizedScore !== a.normalizedScore) {
        return b.normalizedScore - a.normalizedScore;
      }
      return a.label.localeCompare(b.label);
    })
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}
