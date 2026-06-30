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
});
