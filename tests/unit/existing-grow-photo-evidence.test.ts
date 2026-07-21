import {
  existingGrowPhotoCandidates,
  existingGrowPhotoEvidenceInput
} from "@/features/personal/diagnosis/existingGrowPhotoEvidence";

describe("existing grow diagnosis photo evidence", () => {
  it("normalizes, deduplicates, and sorts photos from the selected grow", () => {
    const photos = existingGrowPhotoCandidates(
      [
        {
          id: "other-log",
          growId: "other-grow",
          date: "2026-07-20",
          title: "Wrong grow",
          notes: "",
          photos: ["/uploads/wrong.jpg"],
          createdAt: "2026-07-20",
          updatedAt: "2026-07-20"
        },
        {
          id: "older-log",
          growId: "grow-1",
          date: "2026-07-18T10:00:00.000Z",
          title: "Older canopy",
          notes: "",
          photos: ["/uploads/older.jpg", "/uploads/shared.jpg"],
          createdAt: "2026-07-18T10:00:00.000Z",
          updatedAt: "2026-07-18T10:00:00.000Z"
        },
        {
          id: "newer-log",
          growId: "grow-1",
          plantId: "plant-log",
          date: "2026-07-20T10:00:00.000Z",
          title: "Leaf detail",
          notes: "",
          photos: ["/uploads/shared.jpg", "/uploads/fallback.jpg"],
          photoMetadata: [
            {
              url: "/uploads/newer.jpg",
              plantId: "plant-photo",
              mimeType: "image/jpeg",
              width: 1600,
              height: 1200,
              createdAt: "2026-07-20T12:00:00.000Z"
            }
          ],
          createdAt: "2026-07-20T10:00:00.000Z",
          updatedAt: "2026-07-20T10:00:00.000Z"
        }
      ],
      "grow-1"
    );

    expect(photos.map((photo) => photo.url)).toEqual([
      "/uploads/newer.jpg",
      "/uploads/fallback.jpg",
      "/uploads/older.jpg",
      "/uploads/shared.jpg"
    ]);
    expect(photos[0]).toMatchObject({
      title: "Leaf detail",
      growId: "grow-1",
      plantId: "plant-photo",
      logId: "newer-log",
      mimeType: "image/jpeg",
      width: 1600,
      height: 1200
    });
  });

  it("creates an uploaded diagnosis evidence link without re-uploading the image", () => {
    const input = existingGrowPhotoEvidenceInput(
      {
        id: "log-1:0",
        url: "/uploads/leaf.jpg",
        title: "Leaf detail",
        capturedAt: "2026-07-20T12:00:00.000Z",
        growId: "grow-1",
        logId: "log-1",
        mimeType: "image/jpeg"
      },
      "plant-1"
    );

    expect(input).toEqual(
      expect.objectContaining({
        growId: "grow-1",
        plantId: "plant-1",
        logId: "log-1",
        originalUri: "/uploads/leaf.jpg",
        durableUrl: "/uploads/leaf.jpg",
        source: "upload",
        purpose: "diagnosis",
        uploadStatus: "uploaded",
        aiUsable: true
      })
    );
  });
});
