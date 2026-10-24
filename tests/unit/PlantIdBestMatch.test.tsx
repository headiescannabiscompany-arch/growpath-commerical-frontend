import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import PlantIdentificationResultDetails from "@/features/personal/tools/PlantIdentificationResultDetails";
import { plantIdentificationCandidates, plantIdentificationHeadline, plantIdentificationSelection, safePlantIdentificationOutputs } from "@/features/personal/tools/plantIdentificationCandidates";

const named = (name: string) => ({ scientificName: "Citrus limon", commonNames: [name], horticulturalName: name, rank: "horticultural_type", confidence: "medium", evidence: ["Alternate leaves, round fruit and woody stems"], counterEvidence: ["Other citrus overlaps"], missingEvidence: ["Nursery label"] });
const outputs = {
  likelyCrop: "unknown crop", identityEvidenceStatus: "candidate_only", confirmationAvailable: false,
  candidates: [named("Harvey lemon"), named("Meyer lemon"), named("Ponderosa lemon")],
  imageAnalysis: { performed: true, quality: "usable", confidence: "medium" },
  candidateSelection: { status: "leading_candidate", candidateIndexes: [1], reason: "Leaf and fruit combination favors the selected candidate; identity remains tentative.", discriminator: "Do you have its nursery label?" },
  requiredNextQuestions: ["Do you have its nursery label?"]
};

describe("Plant ID best-match display", () => {
  test("Plant ID absence recovery exposes the saved reason without promoting a stale candidate", () => {
    const reason = "Retake required. The review did not record sufficient diagnostic character observations.";
    const rejected = { ...outputs, identificationNotes: reason, imageAnalysis: { performed: true, quality: "unusable", retakeRequired: true } };
    const prior = JSON.stringify(rejected);
    const view = render(<PlantIdentificationResultDetails outputs={rejected} />);
    expect(view.getByText("Why no identity was accepted")).toBeTruthy();
    expect(view.getByText(reason)).toBeTruthy();
    expect(view.queryByText("Meyer lemon")).toBeNull();
    expect(JSON.stringify(rejected)).toBe(prior);
  });
  test("explicit selected candidate wins over array position without changing output", () => {
    const before = JSON.stringify(outputs);
    expect(plantIdentificationHeadline(outputs)).toEqual({ name: "Meyer lemon", label: "Best candidate · tentative" });
    expect(JSON.stringify(outputs)).toBe(before);
    expect(outputs.confirmationAvailable).toBe(false);
  });
  test("shows a leading named-type card and collapses alternatives until requested", () => {
    const view = render(<PlantIdentificationResultDetails outputs={outputs} />);
    expect(view.getByText("Meyer lemon")).toBeTruthy();
    expect(view.queryByText("Harvey lemon")).toBeNull();
    expect(view.getByText(/Named-type suggestion, not a verified cultivar/)).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Compare other candidates" }));
    expect(view.getByText("Harvey lemon")).toBeTruthy();
    expect(view.getByText("Ponderosa lemon")).toBeTruthy();
    expect(view.getByRole("button", { name: "Hide comparison" }).props.accessibilityState.expanded).toBe(true);
  });
  test("close alternatives show both without choosing a false winner or numeric confidence", () => {
    const close = { ...outputs, candidateSelection: { ...outputs.candidateSelection, status: "close_alternatives", candidateIndexes: [0, 1] } };
    expect(plantIdentificationHeadline(close).name).toBe("Close alternatives");
    const view = render(<PlantIdentificationResultDetails outputs={close} />);
    expect(view.getByText("Meyer lemon")).toBeTruthy();
    expect(view.getByText("Harvey lemon")).toBeTruthy();
    expect(view.queryByText(/\d+%/)).toBeNull();
  });
  test("insufficient evidence and historical candidates do not become best matches", () => {
    expect(plantIdentificationHeadline({ ...outputs, candidateSelection: { status: "insufficient_evidence", candidateIndexes: [], reason: "Missing detail" } }).label).toBe("No reliable species match yet");
    expect(plantIdentificationHeadline({ ...outputs, candidateSelection: undefined }).label).toBe("Previous candidate · unconfirmed");
  });
  test.each([{ indexes: [-1] }, { indexes: [9] }, { indexes: [0.5] }, { indexes: ["1"] }, { indexes: [1, 1] }])("malformed selection $indexes is not used", ({ indexes }) => {
    expect(plantIdentificationSelection({ ...outputs, candidateSelection: { ...outputs.candidateSelection, candidateIndexes: indexes } })).toBeNull();
  });
  test("limited and unusable results cannot leak named suggestions through stale fields", () => {
    for (const quality of ["limited", "unusable"]) {
      const safe = safePlantIdentificationOutputs({ ...outputs, imageAnalysis: { performed: true, quality } });
      expect(safe.candidates.every((item: any) => !item.horticulturalName)).toBe(true);
      expect(plantIdentificationSelection(safe)).toBeNull();
      expect(plantIdentificationHeadline(safe).name).not.toMatch(/Meyer|Harvey|Ponderosa/);
    }
  });
  test("owner identity is distinct from AI history and never demands generic retakes", () => {
    const corrected = { ...outputs, userCorrection: { source: "user_entry", commonName: "Meyer lemon" } };
    expect(plantIdentificationHeadline(corrected)).toEqual({ name: "Meyer lemon", label: "Identified by you" });
    const view = render(<PlantIdentificationResultDetails outputs={corrected} />);
    expect(view.getByText("Meyer lemon — identified by you")).toBeTruthy();
    expect(view.getByText("No new photos are required to keep your correction.")).toBeTruthy();
    expect(view.queryByText("Harvey lemon")).toBeNull();
    expect(view.queryByText("One optional way to narrow it down")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "View original AI candidates" }));
    expect(view.getByText("Harvey lemon")).toBeTruthy();
  });
  test("explicit user entry wins over AI selection", () => {
    expect(plantIdentificationHeadline({ ...outputs, likelyCrop: "Rose", identityEvidenceStatus: "user_entered" })).toEqual({ name: "Rose", label: "Your entered identity" });
  });
  test("final candidates supersede stale drafts and aliases are not separate alternatives", () => {
    expect(plantIdentificationCandidates({ candidates: [], identificationDraft: { candidates: outputs.candidates } })).toEqual([]);
    const same = { scientificName: "Citrus limon", rank: "species", commonNames: ["Lemon"] };
    expect(plantIdentificationCandidates({ candidates: [same, { ...same, commonNames: ["Common lemon"] }] })).toHaveLength(1);
    expect(plantIdentificationCandidates(outputs)).toHaveLength(3);
  });
  test("only one optional question is shown and no extra alternative is invented", () => {
    const view = render(<PlantIdentificationResultDetails outputs={{ ...outputs, candidates: [named("Meyer lemon")], candidateSelection: { ...outputs.candidateSelection, candidateIndexes: [0] } }} />);
    expect(view.getAllByText("• Do you have its nursery label?")).toHaveLength(1);
    expect(view.queryByRole("button", { name: "Compare other candidates" })).toBeNull();
  });
  test("a changed final list cannot inherit a same-length draft winner", () => {
    const draft = { candidates: [named("Meyer lemon")], candidateSelection: { ...outputs.candidateSelection, candidateIndexes: [0] } };
    const current = { candidates: [{ scientificName: "Rosa canina", commonNames: ["Dog rose"], rank: "species" }], identificationDraft: draft };
    expect(plantIdentificationSelection(current)).toBeNull();
    expect(plantIdentificationHeadline(current)).toEqual({ name: "Dog rose", label: "Previous candidate · unconfirmed" });
    expect(plantIdentificationSelection({ identificationDraft: draft })?.candidateIndexes).toEqual([0]);
  });
  test("partial reference checks disclose the gap without denying retained matches", () => {
    const view = render(<PlantIdentificationResultDetails outputs={{ ...outputs,
      referenceLookup: { status: "matched", partial: true, records: [] } }} />);
    expect(view.getByText(/Matched stored records marked reviewed/)).toBeTruthy();
    expect(view.getByText(/Some reference checks were unavailable/)).toBeTruthy();
  });
});
