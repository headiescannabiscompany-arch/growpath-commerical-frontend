import {
  isPersistedImageUri,
  persistImageUri,
  persistImageUris,
  resolveImageUri
} from "@/utils/photoUploads";
import { API_URL } from "@/api/apiRequest";

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
    expect(
      isPersistedImageUri(
        "/api/commercial/feed/64c000000000000000000001/harvest-media/1-abcdef.jpg"
      )
    ).toBe(true);
    expect(isPersistedImageUri("https://example.test/photo.jpg")).toBe(true);
    expect(isPersistedImageUri("file:///tmp/photo.jpg")).toBe(false);
  });

  it("resolves relative uploaded image URLs against the API host for rendering", () => {
    expect(resolveImageUri("/uploads/photo.jpg")).toBe(`${API_URL}/uploads/photo.jpg`);
    expect(resolveImageUri("uploads/photo.jpg")).toBe(`${API_URL}/uploads/photo.jpg`);
    expect(
      resolveImageUri(
        "/api/commercial/feed/64c000000000000000000001/harvest-media/1-abcdef.jpg"
      )
    ).toBe(
      `${API_URL}/api/commercial/feed/64c000000000000000000001/harvest-media/1-abcdef.jpg`
    );
    expect(resolveImageUri("https://example.test/photo.jpg")).toBe(
      "https://example.test/photo.jpg"
    );
    expect(resolveImageUri("file:///tmp/photo.jpg")).toBe("file:///tmp/photo.jpg");
  });

  it("repairs legacy first-party upload URLs that point at the web host", () => {
    expect(resolveImageUri("http://localhost:8081/uploads/legacy-hat.jpg")).toBe(
      `${API_URL}/uploads/legacy-hat.jpg`
    );
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

  it("opts journal photos into preparation without resending saved URLs", async () => {
    const onUploaded = jest.fn();
    mockUploadImage.mockResolvedValue({
      url: "/uploads/prepared.jpg",
      imageMetadata: { sizeBytes: 2000000, width: null }
    });
    await expect(
      persistImageUris(["/uploads/saved.jpg", "blob:phone"], {
        prepareForJournal: true,
        onUploaded
      })
    ).resolves.toEqual(["/uploads/saved.jpg", "/uploads/prepared.jpg"]);
    expect(mockUploadImage).toHaveBeenCalledTimes(1);
    expect(mockUploadImage).toHaveBeenCalledWith("blob:phone", {
      prepareForJournal: true
    });
    expect(onUploaded).toHaveBeenCalledWith("blob:phone", "/uploads/prepared.jpg", {
      sizeBytes: 2000000,
      width: null
    });
  });

  it("reports each completed upload before a later photo fails", async () => {
    const onUploaded = jest.fn();
    mockUploadImage
      .mockResolvedValueOnce({ url: "/uploads/first.jpg" })
      .mockRejectedValueOnce(new Error("Photo cannot be prepared"));
    await expect(
      persistImageUris(["blob:first", "blob:second"], {
        prepareForJournal: true,
        onUploaded
      })
    ).rejects.toThrow("Photo cannot be prepared");
    expect(onUploaded).toHaveBeenCalledTimes(1);
    expect(onUploaded).toHaveBeenCalledWith("blob:first", "/uploads/first.jpg", {});
  });
});
