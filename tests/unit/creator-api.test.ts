const mockApiRequest = jest.fn();
const mockPersistImageUri = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUri: (...args: any[]) => mockPersistImageUri(...args)
}));

describe("creator API uploads", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPersistImageUri.mockResolvedValue("/uploads/signature.png");
    mockApiRequest.mockResolvedValue({ success: true, url: "/uploads/signature.png" });
  });

  it("persists signature images before saving the creator signature URL", async () => {
    const { uploadSignature } = require("@/api/creator");

    await uploadSignature("file:///tmp/signature.png");

    expect(mockPersistImageUri).toHaveBeenCalledWith("file:///tmp/signature.png");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/creator/signature", {
      method: "POST",
      body: { signatureUrl: "/uploads/signature.png" }
    });
  });
});
