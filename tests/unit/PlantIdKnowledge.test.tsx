import React from "react";
import { render } from "@testing-library/react-native";
import PlantIdentificationResultDetails from "@/features/personal/tools/PlantIdentificationResultDetails";
import { plantIdentificationHeadline } from "@/features/personal/tools/plantIdentificationCandidates";

const candidate = { scientificName: "Citrus limon", commonNames: ["Lemon"], rank: "species", confidence: "medium", commonNameSource: "stored_reference", evidence: ["Alternate simple leaves and thorny stems"] };
const outputs = {
  likelyCrop: "unknown crop", scientificName: null, identityEvidenceStatus: "candidate_only",
  confirmationAvailable: false, candidates: [candidate],
  imageAnalysis: { performed: true, quality: "usable", confidence: "medium" }
};
describe("Plant ID knowledge correction", () => {
  test("headlines the best common candidate without changing saved identity or confirmation", () => {
    const prior = JSON.stringify(outputs);
    expect(plantIdentificationHeadline(outputs)).toEqual({ name: "Lemon", label: "Previous candidate · unconfirmed" });
    expect(JSON.stringify(outputs)).toBe(prior);
  });
  test("uses the saved candidate order, not a preferred lemon answer", () => {
    expect(plantIdentificationHeadline({ ...outputs, candidates: [{ ...candidate, scientificName: "Citrus maxima", commonNames: ["Pomelo"] }, candidate] }).name).toBe("Pomelo");
  });
  test("legacy genus result remains Citrus, with no invented species", () => {
    expect(plantIdentificationHeadline({ ...outputs, candidates: [{ scientificName: "Citrus spp.", commonNames: ["Citrus"] }] }).name).toBe("Citrus");
  });
  test("an unusable photo cannot supply a best match from stale output", () => {
    expect(plantIdentificationHeadline({ ...outputs, imageAnalysis: { performed: true, quality: "unusable" } }).name).toBe("No supported match yet");
  });
  test.each(["user_entered", "user_confirmed"])("explicit %s identity wins over a conflicting photo candidate", (status) => {
    const result = plantIdentificationHeadline({ ...outputs, likelyCrop: "Rose", identityEvidenceStatus: status });
    expect(result.name).toBe("Rose");
    expect(result.label).toBe(status === "user_entered" ? "Your entered identity" : "Your confirmed identity");
  });
  test("shows source provenance and related-genus limits separately from external verification", () => {
    const screen = render(<PlantIdentificationResultDetails outputs={{ ...outputs, referenceLookup: {
      status: "matched", recordsOmitted: 1, records: [{ recordId: "test", recordType: "plant_taxon", scientificName: "Citrus maxima", commonNames: ["Pomelo"], matchType: "related_genus", sourceRecords: [{ sourceName: "Synthetic reference", url: "https://example.com/plant", lastReviewedAt: "2026-01-01" }] }]
    } }} />);
    expect(screen.getByText("1. Lemon")).toBeTruthy();
    expect(screen.getByText(/Common name from a stored reference/)).toBeTruthy();
    expect(screen.getByText(/A name match does not confirm/)).toBeTruthy();
    expect(screen.getByText(/Related genus record — not a photo match/)).toBeTruthy();
    expect(screen.getByText(/Synthetic reference/)).toBeTruthy();
    expect(screen.getByText(/No external botanical database was queried/)).toBeTruthy();
    expect(screen.getByText(/Some reference details were omitted/)).toBeTruthy();
  });
  test.each([
    ["no_match", /No eligible stored reference matched/],
    ["unavailable", /preserved without retrying AI/],
    [undefined, /No stored-reference lookup was recorded/]
  ])("reports %s lookup honestly", (status, copy) => {
    const screen = render(<PlantIdentificationResultDetails outputs={{ ...outputs, referenceLookup: status ? { status, records: [] } : undefined }} />);
    expect(screen.getByText(copy as RegExp)).toBeTruthy();
  });
});
