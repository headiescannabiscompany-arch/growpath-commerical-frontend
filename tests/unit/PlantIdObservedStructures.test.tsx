import React from "react";
import { render } from "@testing-library/react-native";
import PlantIdentificationResultDetails from "@/features/personal/tools/PlantIdentificationResultDetails";
import { plantIdentificationHeadline, plantIdentificationSelection } from "@/features/personal/tools/plantIdentificationCandidates";
import fixture from "../fixtures/plantIdObservedStructuresOutputs.json";

// Generated offline by the real normalizer/snapshot/secure mapper/calculator.
// Keep source/output digests with the fixture; do not run server dependencies in
// Expo's mobile test realm or silently reinterpret historical saved results.

describe("Plant ID observed-structure saved display", () => {
  test.each([
    [0, "leading_candidate", "Tomato"],
    [1, "close_alternatives", "Close alternatives"],
    [2, "insufficient_evidence", "Epipremnum spp."],
    [3, "leading_candidate", "Heartleaf philodendron"]
  ])("reply %i keeps tentative ranking through current and reopened display", (index, status, name) => {
    const row = fixture.observations[Number(index)], outputs = row.outputs;
    const original = JSON.stringify(outputs);
    expect(require("node:crypto").createHash("sha256").update(original).digest("hex")).toBe(row.outputsSha256);
    expect(fixture.policyVersion).toBe("plant-id-best-match-v10");
    expect(outputs.confirmationAvailable).toBe(false);
    expect(plantIdentificationSelection(outputs)?.status).toBe(status);
    if (index !== 2) expect(plantIdentificationHeadline(outputs).name).toBe(name);
    else expect(outputs.candidates[0].scientificName).toBe(name);
    for (const displayed of [outputs, JSON.parse(original)]) {
      const screen = render(<PlantIdentificationResultDetails outputs={displayed} />);
      if (status === "leading_candidate") expect(screen.getByText("Best candidate · tentative")).toBeTruthy();
      if (status === "close_alternatives") {
        expect(screen.getByText("Close alternatives — no clear winner yet")).toBeTruthy();
        expect(screen.getByText("Scientific candidate: Solanum nigrum")).toBeTruthy();
        expect(screen.getByText("Scientific candidate: Solanum americanum")).toBeTruthy();
      }
      if (index === 2) {
        expect(screen.getByText("Scientific candidate: Epipremnum spp.")).toBeTruthy();
        expect(screen.queryByText("Best candidate · tentative")).toBeNull();
        expect(displayed.candidates.every((c: any) => c.rank === "genus")).toBe(true);
      }
      for (const action of [...outputs.requiredNextPhotos, ...outputs.requiredNextQuestions]) {
        expect(screen.getAllByText(`• ${action}`)).toHaveLength(1);
      }
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
      expect(screen.queryAllByText(/\d+%/)).toHaveLength(0);
      expect(JSON.stringify(displayed)).toBe(original);
      screen.unmount();
    }
  });
});
