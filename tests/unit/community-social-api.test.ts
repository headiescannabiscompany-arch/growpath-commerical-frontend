const mockApiRequest = jest.fn();
const mockPersistImageUris = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUris: (...args: any[]) => mockPersistImageUris(...args)
}));

describe("community social API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPersistImageUris.mockResolvedValue([
      "/uploads/forum-a.jpg",
      "/uploads/forum-b.jpg"
    ]);
    mockApiRequest.mockResolvedValue({
      post: {
        id: "forum-1",
        title: "Show roots",
        body: "Attached photos",
        photos: ["/uploads/forum-a.jpg", "/uploads/forum-b.jpg"]
      }
    });
  });

  it("persists forum photos before creating discussions", async () => {
    const { createForumPost } = require("@/api/communitySocial");

    const result = await createForumPost({
      title: "Show roots",
      body: "Attached photos",
      photos: ["file:///tmp/forum-a.jpg", "/uploads/forum-b.jpg"]
    });

    expect(mockPersistImageUris).toHaveBeenCalledWith([
      "file:///tmp/forum-a.jpg",
      "/uploads/forum-b.jpg"
    ]);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/forum/create", {
      method: "POST",
      body: {
        title: "Show roots",
        body: "Attached photos",
        photos: ["/uploads/forum-a.jpg", "/uploads/forum-b.jpg"]
      }
    });
    expect(result.photos).toEqual(["/uploads/forum-a.jpg", "/uploads/forum-b.jpg"]);
  });
});
