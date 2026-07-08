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
      title: "Post",
      body: "Post",
      photos: ["/uploads/local.jpg", "/uploads/existing.jpg"]
    });
  });

  it("keeps legacy create post calls on Forum/Q&A instead of the ad feed", async () => {
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
    expect(mockApiRequest).toHaveBeenCalledWith("/api/forum/create", {
      method: "POST",
      body: {
        title: "Post",
        body: "Post",
        linkedPlantId: "plant-1",
        photos: ["/uploads/local.jpg", "/uploads/existing.jpg"]
      }
    });
    expect(result.photos).toEqual(["/uploads/local.jpg", "/uploads/existing.jpg"]);
  });
});
