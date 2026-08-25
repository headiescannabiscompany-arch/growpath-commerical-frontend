import { growPhotoCount, growPhotoRecordId } from "../photoCount";

describe("grow photo counts", () => {
  it("counts unique setup and journal photos for the selected grow", () => {
    expect(
      growPhotoCount(
        { id: "grow-1", photos: ["/uploads/setup.jpg", "/uploads/shared.jpg"] },
        [
          {
            growId: "grow-1",
            photos: ["/uploads/shared.jpg", "/uploads/journal.jpg"]
          },
          { growId: "grow-2", photos: ["/uploads/other-grow.jpg"] }
        ]
      )
    ).toBe(3);
  });

  it("supports linked grow IDs and ignores blank photo values", () => {
    expect(
      growPhotoCount({ _id: "grow-1" }, [
        { linkedGrowId: "grow-1", photos: ["", null, "/uploads/log.jpg"] }
      ])
    ).toBe(1);
    expect(growPhotoRecordId({ _id: "grow-1" })).toBe("grow-1");
  });

  it("does not attach unscoped log photos to a grow", () => {
    expect(
      growPhotoCount({ id: "grow-1", photos: [] }, [
        { photos: ["/uploads/unscoped.jpg"] }
      ])
    ).toBe(0);
  });
});
