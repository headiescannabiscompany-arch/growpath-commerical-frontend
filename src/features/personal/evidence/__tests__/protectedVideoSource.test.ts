import {
  PROTECTED_FRAME_EXTRACTION_MAX_SOURCE_BYTES,
  protectedVideoSourceSizeError
} from "../protectedVideoSource";

describe("protectedVideoSourceSizeError", () => {
  test("accepts an extraction source at the protected limit", () => {
    expect(
      protectedVideoSourceSizeError(PROTECTED_FRAME_EXTRACTION_MAX_SOURCE_BYTES)
    ).toBe("");
  });

  test("rejects a source that the protected worker cannot materialize", () => {
    expect(
      protectedVideoSourceSizeError(
        PROTECTED_FRAME_EXTRACTION_MAX_SOURCE_BYTES + 1
      )
    ).toBe(
      "This private video is too large for protected frame extraction. Choose or export a video no larger than 512 MB, then select it again."
    );
  });

  test("leaves missing picker size metadata for server verification", () => {
    expect(protectedVideoSourceSizeError(undefined)).toBe("");
    expect(protectedVideoSourceSizeError(0)).toBe("");
  });
});
