import { parsePickerSourceCaptureMetadata } from "@/utils/sourceCaptureMetadata";

describe("source capture metadata", () => {
  it("normalizes Android-style decimal GPS and an EXIF date", () => {
    expect(
      parsePickerSourceCaptureMetadata({
        GPSLatitude: 39.1023,
        GPSLongitude: 77.0123,
        GPSLongitudeRef: "W",
        DateTimeOriginal: "2026:08:20 14:15:16"
      })
    ).toEqual({
      latitude: 39.1023,
      longitude: -77.0123,
      capturedLocalDate: "2026-08-20",
      captureDatePrecision: "date",
      source: "picker_exif"
    });
  });

  it("normalizes nested camera degree-minute-second GPS", () => {
    expect(
      parsePickerSourceCaptureMetadata({
        GPS: {
          Latitude: [39, 6, 8.28],
          LatitudeRef: "N",
          Longitude: [77, 0, 44.28],
          LongitudeRef: "W"
        }
      })
    ).toEqual({
      latitude: 39.1023,
      longitude: -77.0123,
      source: "picker_exif"
    });
  });

  it("normalizes iOS-style nested rational GPS values and refs", () => {
    expect(
      parsePickerSourceCaptureMetadata({
        GPS: {
          GPSLatitude: [
            { numerator: 39, denominator: 1 },
            { numerator: 6, denominator: 1 },
            { numerator: 828, denominator: 100 }
          ],
          GPSLatitudeRef: "N",
          GPSLongitude: [
            { numerator: 77, denominator: 1 },
            { numerator: 0, denominator: 1 },
            { numerator: 4428, denominator: 100 }
          ],
          GPSLongitudeRef: "W"
        }
      })
    ).toEqual({
      latitude: 39.1023,
      longitude: -77.0123,
      source: "picker_exif"
    });
  });

  it("normalizes lowercase nested decimal metadata without inventing a ref", () => {
    expect(
      parsePickerSourceCaptureMetadata({
        gps: {
          latitude: -33.8688,
          longitude: 151.2093
        },
        CreateDate: "2026-08-20T14:15:16+10:00"
      })
    ).toEqual({
      latitude: -33.8688,
      longitude: 151.2093,
      capturedAt: "2026-08-20T04:15:16.000Z",
      capturedLocalDate: "2026-08-20",
      captureDatePrecision: "instant",
      source: "picker_exif"
    });
  });

  it("rejects calendar rollover, ambiguous modification dates, and invalid DMS", () => {
    expect(
      parsePickerSourceCaptureMetadata({ DateTimeOriginal: "2026:02:31 14:15:16" })
    ).toBeUndefined();
    expect(
      parsePickerSourceCaptureMetadata({ ModifyDate: "2026:08:20 14:15:16" })
    ).toBeUndefined();
    expect(
      parsePickerSourceCaptureMetadata({
        GPS: {
          Latitude: [39, 61, 0],
          LatitudeRef: "N",
          Longitude: [77, 0, 0],
          LongitudeRef: "W"
        }
      })
    ).toBeUndefined();
  });

  it("keeps a valid date candidate but never invents a missing half-coordinate", () => {
    expect(
      parsePickerSourceCaptureMetadata({
        GPSLatitude: 39.1023,
        DateTimeOriginal: "2026:08:20 14:15:16"
      })
    ).toEqual({
      capturedLocalDate: "2026-08-20",
      captureDatePrecision: "date",
      source: "picker_exif"
    });
  });

  it("uses an EXIF offset for a real instant while preserving the camera-local day", () => {
    expect(
      parsePickerSourceCaptureMetadata({
        DateTimeOriginal: "2026:11:01 01:30:00",
        OffsetTimeOriginal: "-04:00"
      })
    ).toEqual({
      capturedAt: "2026-11-01T05:30:00.000Z",
      capturedLocalDate: "2026-11-01",
      captureDatePrecision: "instant",
      source: "picker_exif"
    });
  });

  it("never pairs one capture field with another field's timezone offset", () => {
    expect(
      parsePickerSourceCaptureMetadata({
        DateTimeOriginal: "2026:11:01 01:30:00",
        DateTimeDigitized: "2026:11:01 02:30:00",
        OffsetTimeDigitized: "-05:00"
      })
    ).toEqual({
      capturedLocalDate: "2026-11-01",
      captureDatePrecision: "date",
      source: "picker_exif"
    });
  });

  it("rejects contradictory or invalid hemisphere refs", () => {
    expect(
      parsePickerSourceCaptureMetadata({
        GPSLatitude: -39.1023,
        GPSLatitudeRef: "N",
        GPSLongitude: 77.0123,
        GPSLongitudeRef: "W"
      })
    ).toBeUndefined();
    expect(
      parsePickerSourceCaptureMetadata({
        GPSLatitude: 39.1023,
        GPSLatitudeRef: "Q",
        GPSLongitude: 77.0123,
        GPSLongitudeRef: "W"
      })
    ).toBeUndefined();
  });

  it("does not invent incomplete, impossible, or missing metadata", () => {
    expect(parsePickerSourceCaptureMetadata({ GPSLatitude: 200 })).toBeUndefined();
    expect(
      parsePickerSourceCaptureMetadata({ GPSLatitude: 39.1, DateTimeOriginal: "nope" })
    ).toBeUndefined();
    expect(parsePickerSourceCaptureMetadata(null)).toBeUndefined();
  });
});
