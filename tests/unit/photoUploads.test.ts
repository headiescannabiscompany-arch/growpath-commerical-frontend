import {
  isPersistedImageUri,
  persistImageUri,
  persistImageUris
} from "@/utils/photoUploads";

const mockUploadImage = jest.fn();

jest.mock("@/api/uploads", () => ({
  uploadImage: (...args: any[]) => mockUploadImage(...args)
}));

describe("photo upload persistence helpers", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUploadImage.mockResolvedValue({ url: "/uploads/photo-1.jpg" });
  });

  it("recognizes durable image URLs", () => {
    expect(isPersistedImageUri("/uploads/photo.jpg")).toBe(true);
    expect(isPersistedImageUri("https://example.test/photo.jpg")).toBe(true);
    expect(isPersistedImageUri("file:///tmp/photo.jpg")).toBe(false);
  });

  it("uploads local image uris and keeps existing persisted urls", async () => {
    const urls = await persistImageUris([
      "/uploads/existing.jpg",
      "file:///tmp/local.jpg",
      "https://example.test/remote.jpg"
    ]);

    expect(mockUploadImage).toHaveBeenCalledWith("file:///tmp/local.jpg");
    expect(urls).toEqual([
      "/uploads/existing.jpg",
      "/uploads/photo-1.jpg",
      "https://example.test/remote.jpg"
    ]);
  });

  it("returns null for empty optional image input", async () => {
    await expect(persistImageUri(null)).resolves.toBeNull();
  });
});
