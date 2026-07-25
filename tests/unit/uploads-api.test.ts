const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/uriToBlob", () => ({
  uriToBlob: jest.fn()
}));

describe("uploads API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockResolvedValue({ url: "/uploads/lesson.pdf" });
  });

  it("uploads course media to the course media endpoint", async () => {
    const { uploadCourseMedia } = require("@/api/uploads");

    const result = await uploadCourseMedia({
      uri: "file:///tmp/lesson.pdf",
      name: "lesson.pdf",
      mimeType: "application/pdf"
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/uploads/course-media", {
      method: "POST",
      body: expect.any(FormData)
    });
    expect(result).toEqual({ url: "/uploads/lesson.pdf" });
  });

  it("uploads an SOP document to the selected Facility endpoint", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      asset: {
        assetId: "asset-1",
        url: "/uploads/room-opening.pdf",
        filename: "room-opening.pdf",
        mimeType: "application/pdf",
        bytes: 1024
      }
    });
    const { uploadSopDocument } = require("@/api/uploads");

    const result = await uploadSopDocument("facility-1", {
      uri: "file:///tmp/room-opening.pdf",
      name: "room-opening.pdf",
      mimeType: "application/pdf"
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facilities/facility-1/sop-documents",
      {
        method: "POST",
        body: expect.any(FormData)
      }
    );
    expect(result).toEqual(
      expect.objectContaining({
        assetId: "asset-1",
        filename: "room-opening.pdf"
      })
    );
  });
});
