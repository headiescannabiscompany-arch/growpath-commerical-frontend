const mockApiRequest = jest.fn();
const mockPersistImageUris = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUris: (...args: any[]) => mockPersistImageUris(...args)
}));

describe("feed API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPersistImageUris.mockResolvedValue([
      "/uploads/local.jpg",
      "/uploads/existing.jpg"
    ]);
    mockApiRequest.mockResolvedValue({
      id: "post-1",
      text: "Post",
      photos: ["/uploads/local.jpg", "/uploads/existing.jpg"]
    });
  });

  it("persists local photos before creating feed posts", async () => {
    const { createFeedPost } = require("@/api/feed");

    const result = await createFeedPost({
      text: "Post",
      plantId: "plant-1",
      photos: ["file:///tmp/local.jpg", "/uploads/existing.jpg"]
    });

    expect(mockPersistImageUris).toHaveBeenCalledWith([
      "file:///tmp/local.jpg",
      "/uploads/existing.jpg"
    ]);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/posts", {
      method: "POST",
      body: {
        text: "Post",
        plantId: "plant-1",
        photos: ["/uploads/local.jpg", "/uploads/existing.jpg"]
      }
    });
    expect(result.photos).toEqual(["/uploads/local.jpg", "/uploads/existing.jpg"]);
  });
});
