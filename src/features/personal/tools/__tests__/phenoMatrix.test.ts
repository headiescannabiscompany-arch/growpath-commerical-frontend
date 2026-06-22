import {
  DEFAULT_PHENO_WEIGHTS,
  rankPhenoCandidates,
  scorePhenoCandidate
} from "../phenoMatrix";

const baseCandidate = {
  id: "p1",
  label: "P1",
  generation: "F1",
  stage: "flower",
  vigor: 8,
  structure: 7,
  aroma: 9,
  resin: 8,
  yield: 7,
  resistance: 8,
  uniformity: 7,
  notes: ""
};

describe("pheno matrix scoring", () => {
  test("scores candidates using weighted trait averages", () => {
    const score = scorePhenoCandidate(baseCandidate, {
      ...DEFAULT_PHENO_WEIGHTS,
      aroma: 2,
      resin: 2
    });

    expect(score.normalizedScore).toBe(7.89);
    expect(score.totalScore).toBe(71);
    expect(score.recommendation).toBe("watch");
  });

  test("ranks candidates by normalized score and then label", () => {
    const ranked = rankPhenoCandidates([
      { ...baseCandidate, id: "b", label: "B", aroma: 10, resin: 10 },
      { ...baseCandidate, id: "a", label: "A", aroma: 10, resin: 10 },
      { ...baseCandidate, id: "c", label: "C", vigor: 3, aroma: 4, resin: 4 }
    ]);

    expect(ranked.map((candidate) => `${candidate.rank}:${candidate.label}`)).toEqual([
      "1:A",
      "2:B",
      "3:C"
    ]);
    expect(ranked[0].recommendation).toBe("keeper");
    expect(ranked[2].recommendation).toBe("cull");
  });

  test("clamps out-of-range trait scores", () => {
    const score = scorePhenoCandidate({
      ...baseCandidate,
      vigor: 12,
      structure: -4
    });

    expect(score.vigor).toBe(12);
    expect(score.structure).toBe(-4);
    expect(score.normalizedScore).toBe(7);
  });
});
