import { videoFrameExtractionInternals } from "@/features/personal/harvest/videoFrameExtraction";

describe("video frame extraction", () => {
  it("samples evenly inside the video instead of using the first or last frame", () => {
    const times = videoFrameExtractionInternals.frameTimes(12, 6);
    expect(times).toHaveLength(6);
    expect(times[0]).toBeGreaterThan(0);
    expect(times[times.length - 1]).toBeLessThan(12);
    expect(times).toEqual([...times].sort((left, right) => left - right));
  });

  it("caps candidate frames at eight", () => {
    expect(videoFrameExtractionInternals.frameTimes(20, 20)).toHaveLength(8);
  });
});
