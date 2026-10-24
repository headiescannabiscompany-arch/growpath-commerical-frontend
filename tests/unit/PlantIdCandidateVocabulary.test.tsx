import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import PlantIdentificationResultDetails from "@/features/personal/tools/PlantIdentificationResultDetails";
import { plantIdentificationHeadline, plantIdentificationSelection, safePlantIdentificationOutputs } from "@/features/personal/tools/plantIdentificationCandidates";

// Failure-shaped saved output, not independently verified botanical identities.
const photo = "Optional: photograph a cut ripe fruit showing rind thickness and segments.";
const result = {
  likelyCrop: "unknown crop", identityEvidenceStatus: "candidate_only", confirmationAvailable: false,
  imageAnalysis: { performed: true, quality: "usable", confidence: "medium" },
  candidates: [
    { scientificName: "Citrus × pyriformis", rank: "horticultural_type", horticulturalName: "Ponderosa-type lemon", confidence: "medium", evidence: ["Rounded fruit, narrow petioles and thorny shoots"], counterEvidence: ["The apparent nursery label is not verified."] },
    { scientificName: "Citrus maxima", rank: "working_candidate", commonNames: ["Pomelo"], confidence: "low" },
    { scientificName: "Citrus × meyeri", rank: "hybrid", commonNames: ["Meyer lemon"], confidence: "low", evidence: ["Rounded fruit, oval leaves and narrow petioles"] }
  ],
  candidateSelection: { status: "leading_candidate", candidateIndexes: [0], reason: "Tentative multi-character comparison, not cultivar verification.", discriminator: "" },
  requiredNextPhotos: [photo], requiredNextQuestions: [], missingInformation: ["Internal fruit structure is unknown.", photo]
};

describe("Plant ID candidate vocabulary display", () => {
  test("the proposed leader and both lower-confidence alternatives stay accessible without rewriting owner identity", () => {
    const before = JSON.stringify(result), view = render(<PlantIdentificationResultDetails outputs={result} />);
    expect(plantIdentificationHeadline(result)).toEqual({ name: "Ponderosa-type lemon", label: "Best candidate · tentative" });
    expect(view.getByText("Ponderosa-type lemon")).toBeTruthy();
    expect(view.queryByText("Meyer lemon")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Compare other candidates" }));
    expect(view.getByText("Pomelo")).toBeTruthy();
    expect(view.getByText("Meyer lemon")).toBeTruthy();
    expect(view.getByText(/Hybrid hypothesis, not verified.*low confidence/)).toBeTruthy();
    expect(JSON.stringify(result)).toBe(before);
    expect(result.confirmationAvailable).toBe(false);
  });
  test("a named hybrid can be displayed as the selected hypothesis without claiming a cultivar or probability", () => {
    const selected = { ...result, candidateSelection: { ...result.candidateSelection, candidateIndexes: [2] } };
    expect(plantIdentificationHeadline(selected)).toEqual({ name: "Meyer lemon", label: "Best candidate · tentative" });
    const view = render(<PlantIdentificationResultDetails outputs={selected} />);
    expect(view.getByText(/Hybrid hypothesis, not verified/)).toBeTruthy();
    expect(view.queryByText(/\d+%/)).toBeNull();
  });
  test("a saved photo discriminator appears once despite the missing-information copy, without changing history", () => {
    const before = JSON.stringify(result), view = render(<PlantIdentificationResultDetails outputs={result} />);
    expect(view.getAllByText(`• ${photo}`)).toHaveLength(1);
    expect(view.getByText("Optional next photo")).toBeTruthy();
    expect(view.queryByText("One optional way to narrow it down")).toBeNull();
    expect(view.getByText("• Internal fruit structure is unknown.")).toBeTruthy();
    expect(JSON.stringify(result)).toBe(before);
  });
  test("limited or unusable hybrid echoes cannot recover a selected exact identity", () => {
    for (const quality of ["limited", "unusable"]) {
      const safe = safePlantIdentificationOutputs({ ...result, imageAnalysis: { ...result.imageAnalysis, quality } });
      expect(safe.candidates.every((item: any) => !["species", "hybrid", "horticultural_type"].includes(item.rank))).toBe(true);
      expect(plantIdentificationSelection(safe)).toBeNull();
      expect(plantIdentificationHeadline(safe).name).not.toMatch(/Meyer|Ponderosa/);
    }
  });
});
