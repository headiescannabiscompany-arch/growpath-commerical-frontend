import React from "react";
import { render } from "@testing-library/react-native";
import PlantIdentificationResultDetails from "@/features/personal/tools/PlantIdentificationResultDetails";
import { plantIdentificationHeadline, plantIdentificationSelection } from "@/features/personal/tools/plantIdentificationCandidates";
import fixture from "../fixtures/plantIdCandidateSummaryOutputs.json";

// Real corrected backend outputs, generated offline with retained/mocked
// references. JSON reopening is not hosted database/browser acceptance.
describe("Plant ID candidate-summary saved display", () => {
  test.each([
    [0, "insufficient_evidence", "Common purslane"],
    [1, "leading_candidate", "Spotted spurge"],
    [2, "leading_candidate", "White clover"],
    [3, "close_alternatives", "Close alternatives"]
  ])("reply %i preserves final ranking and summary through current and reopened display", (index, status, name) => {
    const row = fixture.observations[Number(index)], outputs = row.outputs;
    const serialized = JSON.stringify(outputs);
    expect(require("node:crypto").createHash("sha256").update(serialized).digest("hex")).toBe(row.outputsSha256);
    expect(fixture.policyVersion).toBe("plant-id-best-match-v11");
    expect(plantIdentificationSelection(outputs)?.status).toBe(status);
    expect(plantIdentificationHeadline(outputs).name).toBe(name);
    expect(outputs.confirmationAvailable).toBe(false);
    for (const displayed of [outputs, JSON.parse(serialized)]) {
      const screen = render(<PlantIdentificationResultDetails outputs={displayed} />);
      if (status === "leading_candidate") expect(screen.getByText("Best candidate · tentative")).toBeTruthy();
      if (index === 0) {
        expect(screen.getByText("No reliable species match yet")).toBeTruthy();
        expect(screen.queryByText("Best candidate · tentative")).toBeNull();
        expect(displayed.identificationNotes).not.toMatch(/Trianthema|best (?:working )?match/i);
        // The model's contrary evidence remains visible, not relabeled as gold.
        expect(displayed.candidates[0].counterEvidence.join(" ")).toMatch(/Trianthema/);
      }
      if (index === 2) {
        expect(screen.getByText("Scientific candidate: Trifolium repens")).toBeTruthy();
        expect(screen.getByText("No eligible stored reference matched this candidate in the bounded search. This does not rule out the plant.")).toBeTruthy();
        expect(displayed.candidateSelection.candidateIndexes).toEqual([0]);
        expect(displayed.candidates[0].confidence).toBe("medium");
      }
      if (index === 3) {
        expect(screen.getByText("Close alternatives — no clear winner yet")).toBeTruthy();
        expect(screen.getByText("Scientific candidate: Oxalis stricta")).toBeTruthy();
        expect(screen.getByText("Scientific candidate: Oxalis dillenii")).toBeTruthy();
      }
      for (const action of [...outputs.requiredNextPhotos, ...outputs.requiredNextQuestions]) {
        expect(screen.getAllByText(`• ${action}`)).toHaveLength(1);
      }
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
      expect(screen.queryAllByText(/\d+%/)).toHaveLength(0);
      expect(JSON.stringify(displayed)).toBe(serialized);
      screen.unmount();
    }
  });
});
