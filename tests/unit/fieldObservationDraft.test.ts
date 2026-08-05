import {
  coordinatesFromToolRun,
  privateFieldObservationFromToolRun
} from "@/features/personal/tools/fieldObservationDraft";

describe("private Field Study drafts from saved Plant ID runs", () => {
  const plantIdRun = {
    id: "run-plant-1",
    toolType: "species_crop_id",
    growId: "grow-1",
    inputs: {
      userEnteredName: "Roadside flower",
      observationContext: {
        observationDate: "2026-08-04",
        habitat: "City park edge",
        region: "Raleigh, North Carolina"
      },
      capturedLocation: {
        latitude: 35.7796,
        longitude: -78.6382,
        accuracyMeters: 12,
        privacy: "private",
        userAuthorized: true
      },
      evidenceAssetIds: ["photo-1", "photo-2"],
      mediaEvidence: [
        {
          id: "photo-1",
          type: "photo",
          url: "/uploads/photo-1.jpg",
          purpose: "whole plant"
        },
        {
          id: "photo-2",
          type: "photo",
          url: "/uploads/photo-2.jpg",
          purpose: "open flower"
        }
      ]
    },
    outputs: {
      likelyCrop: "Common milkweed",
      scientificName: "Asclepias syriaca",
      likelyFamily: "Apocynaceae",
      confidence: "medium",
      evidenceUsed: ["Opposite leaves"],
      missingInformation: ["Mature fruit view"],
      identificationDraft: {
        evidence: ["Umbel-like flower cluster"],
        counterEvidence: ["Fruit was not visible"],
        requiredNextPhotos: ["Sharp fruit or seed pod photo"],
        requiredNextQuestions: ["Does the cut stem release latex?"],
        candidates: [
          {
            commonNames: ["Common milkweed"],
            scientificName: "Asclepias syriaca",
            confidence: "medium",
            evidence: ["Opposite leaves"],
            counterEvidence: ["No fruit visible"]
          }
        ]
      }
    }
  };

  it("reuses only an explicitly authorized saved location", () => {
    expect(coordinatesFromToolRun(plantIdRun)).toEqual({
      latitude: 35.7796,
      longitude: -78.6382,
      accuracyMeters: 12
    });

    expect(
      coordinatesFromToolRun({
        ...plantIdRun,
        inputs: {
          ...plantIdRun.inputs,
          capturedLocation: {
            latitude: 35.7796,
            longitude: -78.6382
          }
        }
      })
    ).toBeNull();
  });

  it("builds a private draft with saved identity, context, evidence, and location", () => {
    expect(privateFieldObservationFromToolRun(plantIdRun)).toEqual({
      sourceToolRunId: "run-plant-1",
      growId: "grow-1",
      title: "Common milkweed",
      observationDate: "2026-08-04",
      identity: {
        commonName: "Common milkweed",
        scientificName: "Asclepias syriaca",
        family: "Apocynaceae",
        confidence: "medium",
        verificationStatus: "ai_candidate",
        evidence: ["Umbel-like flower cluster", "Opposite leaves"],
        counterEvidence: ["Fruit was not visible"],
        missingEvidence: [
          "Sharp fruit or seed pod photo",
          "Does the cut stem release latex?",
          "Mature fruit view"
        ],
        candidates: [
          {
            commonName: "Common milkweed",
            scientificName: "Asclepias syriaca",
            confidence: "medium",
            evidence: ["Opposite leaves"],
            counterEvidence: ["No fruit visible"]
          }
        ]
      },
      observationContext: {
        observationDate: "2026-08-04",
        habitat: "City park edge",
        region: "Raleigh, North Carolina"
      },
      evidenceAssets: [
        {
          assetId: "photo-1",
          kind: "photo",
          url: "/uploads/photo-1.jpg",
          label: "whole plant"
        },
        {
          assetId: "photo-2",
          kind: "photo",
          url: "/uploads/photo-2.jpg",
          label: "open flower"
        }
      ],
      location: {
        latitude: 35.7796,
        longitude: -78.6382,
        accuracyMeters: 12,
        precision: "exact",
        privacy: "private",
        exactLocationPublicConfirmed: false
      },
      publication: {
        status: "draft",
        sensitiveSpecies: false,
        publicNotes: "",
        cannabisContextConfirmed: false
      }
    });
  });

  it("lets the caller force a no-coordinate private cannabis draft", () => {
    const result = privateFieldObservationFromToolRun(
      {
        ...plantIdRun,
        outputs: {
          likelyCrop: "Cannabis",
          scientificName: "Cannabis spp.",
          confidence: "high"
        }
      },
      null
    );

    expect(result.location).toEqual({
      privacy: "private",
      exactLocationPublicConfirmed: false
    });
    expect(result.publication).toEqual({
      status: "draft",
      sensitiveSpecies: true,
      publicNotes: "",
      cannabisContextConfirmed: false
    });
  });

  it("recovers legacy photo asset IDs from saved image-analysis provenance", () => {
    const result = privateFieldObservationFromToolRun({
      ...plantIdRun,
      inputs: {
        userEnteredName: "Magnolia",
        observationContext: { region: "Raleigh, North Carolina" }
      },
      outputs: {
        likelyCrop: "Magnolia",
        scientificName: "Magnolia spp.",
        confidence: "medium",
        imageAnalysis: { evidenceUsed: ["legacy-photo-1"] }
      }
    });

    expect(result.evidenceAssets).toEqual([{ assetId: "legacy-photo-1", kind: "photo" }]);
  });

  it("keeps a user-corrected common name but does not restore a rejected scientific name", () => {
    const result = privateFieldObservationFromToolRun({
      ...plantIdRun,
      outputs: {
        likelyCrop: "Cotton plant",
        scientificName: "Rose plant",
        confidence: "user_corrected",
        userCorrection: {
          status: "user_corrected",
          commonName: "Rose bush",
          scientificName: null
        }
      }
    });

    expect(result.title).toBe("Rose bush");
    expect(result.identity).toMatchObject({
      commonName: "Rose bush",
      scientificName: "",
      confidence: "low",
      verificationStatus: "ai_candidate"
    });
  });

  it("rejects unsaved and non-Plant-ID records", () => {
    expect(() =>
      privateFieldObservationFromToolRun({ id: "run-vpd", toolType: "vpd" })
    ).toThrow("Only a saved Plant ID run");
    expect(() =>
      privateFieldObservationFromToolRun({ toolType: "species_crop_id" })
    ).toThrow("Save the Plant ID run");
  });
});
