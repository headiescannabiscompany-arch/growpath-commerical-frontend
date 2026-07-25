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
        expect.stringMatching(/leaf top and underside/i)
      ])
    );
    expect(PHOTO_CAPTURE_GUIDANCE.harvest).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/top, middle, and lower bud sites/i),
        expect.stringMatching(/wider bud-context/i)
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
});
