import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import PlantIdentificationResultDetails from "@/features/personal/tools/PlantIdentificationResultDetails";

function outputs(): Record<string, any> {
  return {
    imageAnalysis: { performed: true, quality: "usable", confidence: "medium" },
    candidates: [{ scientificName: "Citrus limon", commonNames: ["Lemon"], rank: "species", confidence: "medium" }],
    candidateSelection: { status: "leading_candidate", candidateIndexes: [0], reason: "Synthetic photo comparison" },
    confirmationAvailable: false,
    referenceLookup: { performed: true, status: "matched", specimenVerified: false, records: [{
      recordId: "synthetic", recordType: "plant_taxon", scientificName: "Citrus limon", commonNames: ["Lemon"], matchType: "name_match",
      sourceRecords: [], identificationProfile: {
        version: 1, scientificName: "Citrus limon", horticulturalName: "", reviewedAt: "2026-04-01",
        purpose: "reference_comparison", traits: [{ traitId: "leaf-shape", character: "Leaf structure",
          typicalState: "Synthetic reference description", applicability: "Mature true leaves only",
          variation: "Age and growing conditions can change appearance", observationField: "leafType",
          observation: "Simple leaves reported", observationOrigin: "image_analysis", comparisonStatus: "not_assessed",
          sourceRecords: [{ sourceName: "Synthetic trait source", url: "https://example.com/trait", lastReviewedAt: "2026-03-01" }]
        }]
      }
    }] }
  };
}
const profileOf = (value: Record<string, any>) => value.referenceLookup.records[0].identificationProfile;

describe("Plant ID reviewed trait context", () => {
  test("is collapsed by default and shows reference, photo description and applicability separately", () => {
    const value = outputs(); const original = JSON.stringify(value);
    const screen = render(<PlantIdentificationResultDetails outputs={value} />);
    expect(screen.queryByText(/Reference describes:/)).toBeNull();
    const button = screen.getByRole("button", { name: "Compare reference traits: Citrus limon" });
    expect(button.props.accessibilityState.expanded).toBe(false);
    fireEvent.press(button);
    expect(screen.getByText("Reference describes: Synthetic reference description")).toBeTruthy();
    expect(screen.getByText("AI photo description: Simple leaves reported")).toBeTruthy();
    expect(screen.getByText("Applies to: Mature true leaves only")).toBeTruthy();
    expect(screen.getByText(/Can vary: Age and growing/)).toBeTruthy();
    expect(screen.getByText(/have not been scored as a match or conflict/)).toBeTruthy();
    expect(screen.getByText(/Synthetic trait source.*2026-03-01/)).toBeTruthy();
    expect(screen.getByText(/Saved reference version 1.*No new AI call/)).toBeTruthy();
    expect(screen.getByText("Best candidate · tentative")).toBeTruthy();
    expect(JSON.stringify(value)).toBe(original);
    fireEvent.press(screen.getByRole("button", { name: "Hide reference traits: Citrus limon" }));
    expect(screen.queryByText(/Reference describes:/)).toBeNull();
  });

  test("shows missing features as unrecorded rather than conflicts or additional required questions", () => {
    const value = outputs(); profileOf(value).traits[0].observation = null;
    profileOf(value).traits[0].observationOrigin = "not_recorded";
    const screen = render(<PlantIdentificationResultDetails outputs={value} />);
    fireEvent.press(screen.getByRole("button", { name: "Compare reference traits: Citrus limon" }));
    expect(screen.getByText("Photo description: not recorded for this feature.")).toBeTruthy();
    expect(screen.getByText(/Missing or unseen features are not evidence against/)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText("Optional next photo")).toBeNull();
  });

  test("does not present a related named-type reference as the selected species or a verified cultivar", () => {
    const value = outputs(); profileOf(value).horticulturalName = "Meyer lemon";
    value.referenceLookup.records[0].matchType = "related_genus";
    const screen = render(<PlantIdentificationResultDetails outputs={value} />);
    fireEvent.press(screen.getByRole("button", { name: "Compare reference traits: Meyer lemon" }));
    expect(screen.getByText("This named-type reference is not a selected AI candidate.")).toBeTruthy();
    expect(screen.getByText(/Related genus record — not a photo match/)).toBeTruthy();
    expect(screen.getByText("Best candidate · tentative")).toBeTruthy();
    expect(screen.queryByText("Meyer lemon — identified by you")).toBeNull();
  });

  test.each(["limited", "unusable", "not performed", "corrected", "lookup not performed"])("hides trait comparisons for %s results", (kind) => {
    const value = outputs();
    if (["limited", "unusable"].includes(kind)) value.imageAnalysis.quality = kind;
    if (kind === "not performed") value.imageAnalysis.performed = false;
    if (kind === "corrected") value.userCorrection = { source: "user_entry", commonName: "User's plant" };
    if (kind === "lookup not performed") value.referenceLookup.performed = false;
    const screen = render(<PlantIdentificationResultDetails outputs={value} />);
    expect(screen.queryByText(/Compare reference traits:/)).toBeNull();
  });

  test("keeps legacy records usable without inventing trait coverage", () => {
    const value = outputs(); delete value.referenceLookup.records[0].identificationProfile;
    const screen = render(<PlantIdentificationResultDetails outputs={value} />);
    expect(screen.queryByText(/Compare reference traits:/)).toBeNull();
    expect(screen.getByText(/A name match does not confirm/)).toBeTruthy();
  });

  test("refuses an incompatible snapshot and an unsupported automatic-match claim", () => {
    const value = outputs(); profileOf(value).scientificName = "Rosa canina";
    const screen = render(<PlantIdentificationResultDetails outputs={value} />);
    expect(screen.queryByText(/Compare reference traits:/)).toBeNull();
    const altered = outputs(); profileOf(altered).traits[0].comparisonStatus = "confirmed_match";
    screen.rerender(<PlantIdentificationResultDetails outputs={altered} />);
    expect(screen.queryByText(/Compare reference traits:/)).toBeNull();
  });

  test("resets expansion for a different saved receipt without refreshing its reference version", () => {
    const screen = render(<PlantIdentificationResultDetails outputs={outputs()} />);
    fireEvent.press(screen.getByRole("button", { name: "Compare reference traits: Citrus limon" }));
    const old = outputs(); profileOf(old).version = 2;
    screen.rerender(<PlantIdentificationResultDetails outputs={old} />);
    expect(screen.queryByText(/Reference describes:/)).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Compare reference traits: Citrus limon" }));
    expect(screen.getByText(/Saved reference version 2/)).toBeTruthy();
  });

  test("reports size-omitted trait context while preserving original candidate display", () => {
    const value = outputs(); delete value.referenceLookup.records[0].identificationProfile;
    value.referenceLookup.traitProfilesOmitted = 1;
    const screen = render(<PlantIdentificationResultDetails outputs={value} />);
    expect(screen.getByText(/Some reference details were omitted/)).toBeTruthy();
    expect(screen.getByText("Best candidate · tentative")).toBeTruthy();
  });
});
