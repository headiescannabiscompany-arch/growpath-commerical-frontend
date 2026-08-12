import {
  assessEvidencePhoto,
  PHOTO_CAPTURE_GUIDANCE,
  PLANT_REVIEW_PHOTO_LIMIT
} from "@/features/personal/diagnosis/photoEvidenceQuality";

describe("plant review photo quality", () => {
  it("keeps the shared plant-review ceiling at 12 photos", () => {
    expect(PLANT_REVIEW_PHOTO_LIMIT).toBe(12);
    expect(PHOTO_CAPTURE_GUIDANCE.diagnosis).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/zoomed-out whole-plant/i),
        expect.stringMatching(/leaf top and underside/i),
        expect.stringMatching(/describe or mark the exact target/i)
      ])
    );
    expect(PHOTO_CAPTURE_GUIDANCE.ipm).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/several organisms or objects/i),
        expect.stringMatching(/must not assume the largest subject/i)
      ])
    );
    expect(PHOTO_CAPTURE_GUIDANCE.harvest).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/top, middle, and lower bud sites/i),
        expect.stringMatching(/wider bud-context/i),
        expect.stringMatching(/12 wide photos cannot replace three true macros/i)
      ])
    );
    expect(PHOTO_CAPTURE_GUIDANCE.crop_identification).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/whole-plant photo/i),
        expect.stringMatching(/leaf-top, leaf-underside, and stem-node/i),
        expect.stringMatching(/direct flash against a dark background/i)
      ])
    );
    expect(PHOTO_CAPTURE_GUIDANCE.crop_identification).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/whole-plant photo/i),
        expect.stringMatching(/leaf-top, leaf-underside, and stem-node/i),
        expect.stringMatching(/direct flash against a dark background/i)
      ])
    );
  });

  it("rejects an obviously tiny image before provider upload", () => {
    expect(
      assessEvidencePhoto(
        {
          width: 240,
          height: 180,
          fileSizeBytes: 30 * 1024,
          mimeType: "image/jpeg"
        },
        "diagnosis"
      )
    ).toMatchObject({
      accepted: false,
      error: expect.stringMatching(/too small/i)
    });
  });

  it("applies plant-review screening to dedicated crop-identification evidence", () => {
    expect(
      assessEvidencePhoto(
        {
          width: 240,
          height: 180,
          fileSizeBytes: 30 * 1024,
          mimeType: "image/jpeg"
        },
        "crop_identification"
      )
    ).toMatchObject({
      accepted: false,
      error: expect.stringMatching(/too small/i)
    });
  });

  it("warns about limited detail and screenshots without claiming blur detection", () => {
    const result = assessEvidencePhoto(
      {
        width: 800,
        height: 600,
        fileSizeBytes: 70 * 1024,
        fileName: "Screenshot leaf issue.png",
        mimeType: "image/png"
      },
      "ipm"
    );

    expect(result.accepted).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/resolution is limited/i),
        expect.stringMatching(/heavily compressed/i),
        expect.stringMatching(/screenshots/i)
      ])
    );
    expect(result.warnings.join(" ")).not.toMatch(/is blurry/i);
  });

  it("does not impose diagnostic screening on unrelated product media", () => {
    expect(
      assessEvidencePhoto({ width: 100, height: 100, fileSizeBytes: 2 * 1024 }, "product")
    ).toEqual({ accepted: true, warnings: [] });
  });

  it("applies the shared minimum-resolution screen to crop identification", () => {
    expect(
      assessEvidencePhoto(
        {
          width: 300,
          height: 240,
          fileSizeBytes: 40 * 1024,
          mimeType: "image/jpeg"
        },
        "crop_identification"
      )
    ).toMatchObject({
      accepted: false,
      error: expect.stringMatching(/too small/i)
    });
  });

  it("does not call a normal 1080p phone photo unresolvable from dimensions alone", () => {
    const result = assessEvidencePhoto(
      {
        width: 1080,
        height: 1920,
        fileSizeBytes: 600 * 1024,
        fileName: "phone-macro.jpg",
        mimeType: "image/jpeg"
      },
      "harvest"
    );

    expect(result).toEqual({ accepted: true, warnings: [] });
  });
});
