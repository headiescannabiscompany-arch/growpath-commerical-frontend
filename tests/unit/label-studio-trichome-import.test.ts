const {
  convertLabelStudioExport,
  normalizedBox,
  normalizedClass
} = require("../../scripts/lib/label-studio-trichome-import.cjs");

function metadata(overrides: any = {}) {
  return {
    eligibilityPolicy: { minimumQualifiedImages: 50 },
    tasks: [
      {
        taskId: "101",
        imageId: "rights-cleared-image-1",
        assetLocator: "private-calibration/image-1.jpg",
        captureSessionId: "session-1",
        deviceModel: "phone-model-a",
        lightingConditions: ["neutral"],
        rights: {
          sourceId: "growpath-owned",
          licenseId: "GROWPATH_OWNED",
          reviewedAt: "2026-08-12",
          approvedForCommercialQa: true,
          attribution: "GrowPathAI owner-supplied calibration image"
        },
        ...overrides
      }
    ]
  };
}

function exportTask(options: any = {}) {
  const finalResult = [
    {
      id: "head-1",
      type: "rectanglelabels",
      value: {
        x: 10,
        y: 20,
        width: 5,
        height: 6,
        rotation: 0,
        rectanglelabels: ["Amber or warm light"]
      }
    }
  ];
  return [
    {
      id: 101,
      data: { image: "not-copied-to-output" },
      annotations: options.annotations || [
        { id: 1, completed_by: 11, result: finalResult },
        { id: 2, completed_by: 22, ground_truth: true, result: finalResult }
      ]
    }
  ];
}

describe("Label Studio Harvest trichome import", () => {
  it("normalizes approved labels and percentage boxes", () => {
    expect(normalizedClass("Amber or warm light")).toBe("amber_or_warm_light");
    expect(normalizedClass("Not a head")).toBe("");
    expect(normalizedBox({ x: 10, y: 20, width: 5, height: 6 })).toEqual({
      x: 0.1,
      y: 0.2,
      width: 0.05,
      height: 0.06
    });
  });

  it("imports only the adjudicated result and preserves rights/reviewer evidence", () => {
    const converted = convertLabelStudioExport(exportTask(), metadata());

    expect(converted).toMatchObject({
      schemaVersion: "growpath-harvest-trichome-annotations-v1",
      status: "imported_requires_final_review",
      evaluationReady: false,
      importSource: "label_studio_json",
      images: [
        {
          imageId: "rights-cleared-image-1",
          assetLocator: "private-calibration/image-1.jpg",
          reviewerAgreement: {
            independentReviewers: 2,
            adjudicated: true,
            adjudicatedAnnotationId: "2"
          },
          heads: [
            {
              id: "head-1",
              class: "amber_or_warm_light",
              box: { x: 0.1, y: 0.2, width: 0.05, height: 0.06 }
            }
          ]
        }
      ]
    });
    expect(converted.images[0]).not.toHaveProperty("image");
  });

  it("rejects a single reviewer or a non-adjudicated task", () => {
    expect(() =>
      convertLabelStudioExport(
        exportTask({
          annotations: [
            {
              id: 1,
              completed_by: 11,
              ground_truth: true,
              result: exportTask()[0].annotations[1].result
            }
          ]
        }),
        metadata()
      )
    ).toThrow(/two independent reviewers/i);

    expect(() =>
      convertLabelStudioExport(
        exportTask({
          annotations: [
            { id: 1, completed_by: 11, result: [] },
            { id: 2, completed_by: 22, result: [] }
          ]
        }),
        metadata()
      )
    ).toThrow(/no adjudicated annotation/i);
  });

  it("rejects rotated boxes and incomplete rights metadata", () => {
    const task = exportTask();
    task[0].annotations[1].result[0].value.rotation = 15;
    expect(() => convertLabelStudioExport(task, metadata())).toThrow(
      /invalid or rotated box/i
    );
    expect(() =>
      convertLabelStudioExport(exportTask(), metadata({ rights: {} }))
    ).toThrow(/metadata is incomplete/i);
  });

  it("ships an empty metadata template without production media or user data", () => {
    const template = require("../fixtures/harvest-trichome-label-metadata-template.json");

    expect(template).toMatchObject({
      schemaVersion: "growpath-harvest-trichome-label-metadata-v1",
      eligibilityPolicy: {
        minimumQualifiedImages: 50,
        minimumLabeledHeads: 1000,
        independentReviewersPerImage: 2,
        adjudicationRequired: true
      },
      tasks: []
    });
  });
});
