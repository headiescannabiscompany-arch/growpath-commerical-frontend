import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import PlantIdentificationResultDetails from "@/features/personal/tools/PlantIdentificationResultDetails";
import { plantIdentificationHeadline } from "@/features/personal/tools/plantIdentificationCandidates";
import fixture from "../fixtures/plantIdSavedFilterOutputs.json";

describe("Plant ID saved-response display repair", () => {
  test.each(fixture.results)("$sampleId preserves the actual calculator output without confirming it", ({ sampleId, outputs }) => {
    const before = JSON.stringify(outputs);
    const view = render(<PlantIdentificationResultDetails outputs={outputs} />);
    if (sampleId === "sample-0005") {
      expect(view.getByText("Close alternatives — no clear winner yet")).toBeTruthy();
      expect(plantIdentificationHeadline(outputs).name).toBe("Close alternatives");
    } else {
      expect(view.getByText("Best candidate · tentative")).toBeTruthy();
      expect(plantIdentificationHeadline(outputs).name).toBe(outputs.candidates[outputs.candidateSelection.candidateIndexes[0]].commonNames[0]);
    }
    expect(outputs.confirmationAvailable).toBe(false);
    expect(outputs.requiredNextPhotos.length + outputs.requiredNextQuestions.length).toBeLessThanOrEqual(1);
    for (const request of [...outputs.requiredNextPhotos, ...outputs.requiredNextQuestions]) {
      expect(view.getAllByText(`• ${request}`)).toHaveLength(1);
    }
    expect(JSON.stringify(outputs)).toBe(before);
  });
  test("peace lily alternatives are reachable without implying the leading species is confirmed", () => {
    const outputs = fixture.results[3].outputs;
    const view = render(<PlantIdentificationResultDetails outputs={outputs} />);
    expect(view.queryByText("Scientific candidate: Spathiphyllum cannifolium")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Compare other candidates" }));
    expect(view.getByText("Scientific candidate: Spathiphyllum cannifolium")).toBeTruthy();
    expect(view.queryByText(/\d+%/)).toBeNull();
  });
  test("close grass alternatives do not silently choose a species after reload", () => {
    const outputs = JSON.parse(JSON.stringify(fixture.results[4].outputs));
    const view = render(<PlantIdentificationResultDetails outputs={outputs} />);
    expect(view.getByText("Scientific candidate: Digitaria sanguinalis")).toBeTruthy();
    expect(view.getByText("Scientific candidate: Digitaria ciliaris")).toBeTruthy();
    expect(view.queryByText("Scientific candidate: Digitaria ischaemum")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Compare other candidates" }));
    expect(view.getByText("Scientific candidate: Digitaria ischaemum")).toBeTruthy();
    expect(plantIdentificationHeadline(outputs).label).toBe("No clear winner yet");
  });
});
